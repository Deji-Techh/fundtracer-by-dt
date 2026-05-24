import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useRoomMessages } from '../../../hooks/useRoomMessages';
import { useRoomPins } from '../../../hooks/useRoomPins';
import { useMentionAutocomplete } from '../../../hooks/useMentionAutocomplete';
import { useInvestigationSocket } from '../../../hooks/useInvestigationSocket';
import { useNotify } from '../../../contexts/ToastContext';
import {
  getRoomDetails,
  createInvite,
  removeMember,
  promoteMember,
  leaveRoom,
  createRoom,
  getRooms,
} from '../../../api';
import { RoomHeader } from './RoomHeader';
import { RoomLayout } from './RoomLayout';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { SidebarTabs, SidebarTab } from './SidebarTabs';
import { MessageHistory } from './MessageHistory';
import { EvidenceBoard } from './EvidenceBoard';
import { MemberList } from './MemberList';
import { CreateRoomModal } from './CreateRoomModal';
import { useIsMobile } from '../../../hooks/useIsMobile';
import './InvestigationRoomView.css';

interface MemberData {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'member';
  isOnline: boolean;
  joinedAt: number;
}

interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: number;
  updatedAt?: number;
  seedAddress?: string;
  seedChain?: string;
  memberCount: number;
  lastMessageAt?: number;
  lastMessagePreview?: string;
  isPublic: boolean;
  inviteCode: string;
  pinCount: number;
}

interface InvestigationRoomViewProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallet?: string;
  currentChain?: string;
  defaultRoomId?: string | null;
}

export function InvestigationRoomView({ isOpen, onClose, currentWallet, currentChain, defaultRoomId }: InvestigationRoomViewProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const notify = useNotify();

  // Room list + active room
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<Room | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Create room modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Chat input
  const [inputValue, setInputValue] = useState('');
  const [inputCursor, setInputCursor] = useState(0);

  // Sidebar tab
  const [activeTab, setActiveTab] = useState<SidebarTab>('history');

  // Processing AI
  const [isProcessingAi, setIsProcessingAi] = useState(false);

  // Force reconnect flag
  const forceReconnectRef = useRef(0);

  // Messages + Pins hooks
  const { messages, isLoading: msgsLoading, hasMore, loadMore, send } = useRoomMessages(activeRoomId, user?.uid, user?.displayName || user?.email);
  const { pins, pinMessage, unpinMessage } = useRoomPins(activeRoomId);

  // WebSocket
  const { connected, onlineUids, startTyping, stopTyping } = useInvestigationSocket(activeRoomId);

  // Mention autocomplete
  const { isActive: mentionActive, suggestions: mentionSuggestions, filter, atIndex, applyMention } =
    useMentionAutocomplete(inputValue, inputCursor, members);

  const [mentionIndex, setMentionIndex] = useState(0);

  // Use defaultRoomId when provided (e.g. from invite link)
  useEffect(() => {
    if (defaultRoomId && isOpen) {
      setActiveRoomId(defaultRoomId);
    }
  }, [defaultRoomId, isOpen]);

  // Load rooms list
  useEffect(() => {
    if (!isOpen || !user) return;
    const load = async () => {
      setIsLoadingRooms(true);
      try {
        const list = await getRooms();
        setRooms(list);
        if (list.length > 0 && !activeRoomId) {
          setActiveRoomId(list[0].id);
        } else if (list.length === 0) {
          setShowCreateModal(true);
        }
      } catch {
        // No rooms
      } finally {
        setIsLoadingRooms(false);
      }
    };
    load();
  }, [isOpen, user]);

  // Load room details + members
  useEffect(() => {
    if (!activeRoomId) {
      setRoomDetails(null);
      setMembers([]);
      return;
    }
    const load = async () => {
      try {
        const data = await getRoomDetails(activeRoomId);
        setRoomDetails(data.room || data);
        setMembers(data.members || []);
      } catch {
        // fail silently
      }
    };
    load();
  }, [activeRoomId]);

  // Reset mention index when suggestions change
  useEffect(() => {
    setMentionIndex(0);
  }, [mentionSuggestions.length]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;
    const val = inputValue;
    setInputValue('');

    // Check for @FT MAVERIICK command
    if (val.toLowerCase().includes('@ft maverick')) {
      setIsProcessingAi(true);
    }

    try {
      await send(val);
    } catch {
      setInputValue(val);
    }
    // AI processing completion is handled via WebSocket ai_card event
  }, [inputValue, send]);

  useEffect(() => {
    // Reset AI processing when a new AI card message arrives
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.contentType === 'ai_card') {
      setIsProcessingAi(false);
    }
  }, [messages]);

  const handlePin = useCallback(async (messageId: string) => {
    try {
      await pinMessage(messageId, 'evidence');
    } catch {
      // fail silently
    }
  }, [pinMessage]);

  const handleUnpin = useCallback(async (messageId: string) => {
    try {
      await unpinMessage(messageId);
    } catch {
      // fail silently
    }
  }, [unpinMessage]);

  const handleInvite = useCallback(async () => {
    if (!activeRoomId) return;
    try {
      const data = await createInvite(activeRoomId);
      const inviteUrl = data.inviteUrl || data.url;
      if (inviteUrl) {
        await navigator.clipboard.writeText(inviteUrl);
        notify.success('Invite link copied to clipboard');
      }
    } catch {
      // fail silently
    }
  }, [activeRoomId, notify]);

  const handleRemoveMember = useCallback(async (uid: string) => {
    if (!activeRoomId) return;
    try {
      await removeMember(activeRoomId, uid);
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
    } catch {
      // fail silently
    }
  }, [activeRoomId]);

  const handlePromoteMember = useCallback(async (uid: string, role: string) => {
    if (!activeRoomId) return;
    try {
      await promoteMember(activeRoomId, uid, role);
      setMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, role: role as 'admin' | 'member' } : m))
      );
    } catch {
      // fail silently
    }
  }, [activeRoomId]);

  const handleCreateRoom = useCallback(async (params: { name: string; description: string }) => {
    setCreateLoading(true);
    setCreateError('');
    try {
      const data = await createRoom({
        name: params.name,
        description: params.description,
        seedAddress: currentWallet,
        seedChain: currentChain,
      });
      const newRoom = data.room || data;
      setRooms((prev) => [newRoom, ...prev]);
      setActiveRoomId(newRoom.id);
      setShowCreateModal(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create room');
    } finally {
      setCreateLoading(false);
    }
  }, [currentWallet, currentChain]);

  const handleSelectRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
    forceReconnectRef.current++;
  }, []);

  const handleMentionSelect = useCallback((member: MemberData) => {
    const newValue = applyMention(member);
    setInputValue(newValue);
  }, [applyMention]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    if (connected) {
      startTyping();
    }
  }, [connected, startTyping]);

  const handleCursorChange = useCallback((cursor: number) => {
    setInputCursor(cursor);
  }, []);

  const userMemberData = members.find((m) => m.uid === user?.uid);
  const currentUserRole = userMemberData?.role;

  const typingNames = onlineUids
    .filter((uid) => uid !== user?.uid)
    .map((uid) => members.find((m) => m.uid === uid)?.displayName)
    .filter(Boolean) as string[];

  if (isMobile) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ir-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="ir-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.88 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />

            <motion.div
              className="ir-panel"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              {/* Room Selector (if multiple rooms) + Header */}
              {rooms.length > 1 && (
                <div className="ir-room-tabs">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      className={`ir-room-tab ${room.id === activeRoomId ? 'active' : ''}`}
                      onClick={() => handleSelectRoom(room.id)}
                    >
                      {room.name}
                    </button>
                  ))}
                  <button
                    className="ir-room-tab-new"
                    onClick={() => setShowCreateModal(true)}
                  >
                    + New
                  </button>
                </div>
              )}

              <RoomHeader
                name={roomDetails?.name || 'Investigation Room'}
                memberCount={members.length}
                onInvite={handleInvite}
                onClose={onClose}
                showExport={!!user}
              />

              {activeRoomId ? (
                <RoomLayout
                  chat={
                    <>
                      <ChatMessageList
                        messages={messages}
                        isLoading={msgsLoading}
                        hasMore={hasMore}
                        isLoadingMore={false}
                        onLoadMore={loadMore}
                        currentUserId={user?.uid}
                        typingNames={typingNames}
                        onPin={handlePin}
                        onUnpin={handleUnpin}
                        isProcessingAi={isProcessingAi}
                      />
                      <ChatInput
                        value={inputValue}
                        onChange={handleInputChange}
                        onCursorChange={handleCursorChange}
                        onSend={handleSend}
                        disabled={!connected && activeRoomId !== null}
                        mentionSuggestions={mentionSuggestions}
                        mentionActive={mentionActive}
                        mentionActiveIndex={mentionIndex}
                        onMentionSelect={handleMentionSelect}
                      />
                    </>
                  }
                  sidebar={
                    <>
                      <SidebarTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        pinCount={pins.length}
                        memberCount={members.length}
                      />
                      <div className="ir-sidebar-content">
                        {activeTab === 'history' && (
                          <MessageHistory
                            rooms={rooms}
                            activeRoomId={activeRoomId}
                            onSelectRoom={handleSelectRoom}
                          />
                        )}
                        {activeTab === 'pins' && (
                          <EvidenceBoard
                            pins={pins}
                            onUnpin={handleUnpin}
                            canUnpin={!!currentUserRole}
                          />
                        )}
                        {activeTab === 'members' && (
                          <MemberList
                            members={members}
                            currentUserId={user?.uid}
                            currentUserRole={currentUserRole}
                            onRemoveMember={currentUserRole === 'admin' || currentUserRole === 'owner' ? handleRemoveMember : undefined}
                            onPromoteMember={currentUserRole === 'owner' ? handlePromoteMember : undefined}
                          />
                        )}
                      </div>
                    </>
                  }
                />
              ) : !isLoadingRooms && !showCreateModal ? (
                <div className="ir-empty" style={{ flex: 1 }}>
                  <p className="ir-empty-text">No investigation rooms yet</p>
                  <p className="ir-empty-sub">Create a room to start collaborating with your team on wallet investigations</p>
                  <button className="ir-empty-btn" onClick={() => setShowCreateModal(true)}>
                    Create Your First Room
                  </button>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
        isLoading={createLoading}
        error={createError}
        seedAddress={currentWallet}
        seedChain={currentChain}
      />
    </>
  );
}

export default InvestigationRoomView;
