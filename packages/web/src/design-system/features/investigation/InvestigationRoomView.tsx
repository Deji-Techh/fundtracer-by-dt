import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useRoomMessages } from '../../../hooks/useRoomMessages';
import { useRoomPins } from '../../../hooks/useRoomPins';
import { useMentionAutocomplete } from '../../../hooks/useMentionAutocomplete';
import { useInvestigationSocket } from '../../../hooks/useInvestigationSocket';
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
import { EvidenceKanban } from './EvidenceKanban';
import { MemberList } from './MemberList';
import { CreateRoomModal } from './CreateRoomModal';
import { InviteDialog } from './InviteDialog';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { API_BASE } from '../../../api';
import { CommandPalette } from './CommandPalette';
import { ReplyBar } from './ReplyBar';
import { MessageReactions } from './MessageReactions';
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

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  // Chat input
  const [inputValue, setInputValue] = useState('');
  const [inputCursor, setInputCursor] = useState(0);

  // Sidebar tab
  const [activeTab, setActiveTab] = useState<SidebarTab>('history');

  // Processing AI
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Force reconnect flag
  const forceReconnectRef = useRef(0);

  // Command palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<any>(null);

  // Reactions persisted per room
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>(() => {
    if (!activeRoomId) return {};
    const saved = localStorage.getItem(`ft_reactions_${activeRoomId}`);
    return saved ? JSON.parse(saved) : {};
  });

  // AI Agent (FT MAVERIICK) proactive mode
  const [aiAgentActive, setAiAgentActive] = useState(true);
  const aiAgentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiInitializedRef = useRef(false);

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

  // Reload reactions from localStorage when switching rooms
  useEffect(() => {
    if (!activeRoomId) return;
    const saved = localStorage.getItem(`ft_reactions_${activeRoomId}`);
    setReactions(saved ? JSON.parse(saved) : {});
  }, [activeRoomId]);

  const handleCursorChange = useCallback((cursor: number) => {
    setInputCursor(cursor);
  }, []);

  // Helper: fetch from SSE endpoint and collect complete response
  const fetchSSE = useCallback(async (body: Record<string, any>): Promise<string> => {
    const token = localStorage.getItem('fundtracer_token');
    const res = await fetch(`${API_BASE}/api/ai-chat/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('AI request failed');
    const reader = res.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6);
        if (jsonStr.trim() === '[DONE]') continue;
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === 'chunk' && data.content) fullResponse += data.content;
          else if (data.type === 'complete' && data.fullResponse) fullResponse = data.fullResponse;
          else if (data.type === 'error') throw new Error(data.message);
        } catch (e: any) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
    return fullResponse;
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;
    const val = inputValue;
    setInputValue('');

    const replyPayload = replyingTo ? { parentMessageId: replyingTo.id } : {};

    // Send the original message to the room first
    try {
      await send(val, replyPayload);
      setReplyingTo(null);
    } catch {
      setInputValue(val);
      return;
    }

    // Handle @FT MAVERIICK commands on the client side (like the AI modal does)
    // Server-side processMaverickCommand can't auth to the internal API
    const isAiMention = val.toLowerCase().includes('@ft maveriick');
    if (!isAiMention) return;

    setIsProcessingAi(true);
    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    processingTimeoutRef.current = setTimeout(() => setIsProcessingAi(false), 30000);

    const addressMatch = val.match(/0x[a-fA-F0-9]{40}/);
    const address = addressMatch ? addressMatch[0] : null;

    try {
      const token = localStorage.getItem('fundtracer_token');
      if (address) {
        // Call the same analyze-wallet endpoint the AI modal uses
        const res = await fetch(`${API_BASE}/api/ai-chat/analyze-wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({ address, chain: roomDetails?.seedChain || currentChain || 'ethereum' }),
        });

        if (!res.ok) throw new Error('Analysis failed');

        const data = await res.json();
        const a = data.analysis || {};
        const summary = [
          `**FT MAVERIICK Analysis** — \`${address}\``,
          `• Risk: **${a.riskLevel || 'unknown'}** (score: ${a.riskScore ?? 'N/A'})`,
          `• Transactions: ${a.totalTransactions ?? 0}`,
          a.balance != null ? `• Balance: ${Number(a.balance).toFixed(4)} ETH` : null,
          a.totalValueSentEth != null ? `• Total sent: ${Number(a.totalValueSentEth).toFixed(2)} ETH` : null,
          a.totalValueReceivedEth != null ? `• Total received: ${Number(a.totalValueReceivedEth).toFixed(2)} ETH` : null,
          a.flags?.length ? `• Flags: ${a.flags.join(', ')}` : null,
        ].filter(Boolean).join('\n');

        await send(summary);
      } else {
        // No address — ask AI directly
        const reply = await fetchSSE({ question: val.replace(/@FT\s+MAVERIICK/i, '').trim() || 'Analyze the current investigation context.' });
        if (reply) {
          await send(`@FT MAVERIICK ${reply}`);
        }
      }
    } catch {
      await send('@FT MAVERIICK Analysis failed. Please try again with a valid wallet address.');
    }

    setIsProcessingAi(false);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, [inputValue, send, replyingTo, roomDetails?.seedChain, currentChain, fetchSSE]);

  useEffect(() => {
    // Reset AI processing when a new AI card message or Maverick response arrives
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.contentType === 'ai_card' || lastMsg?.senderName === 'FT MAVERIICK') {
      setIsProcessingAi(false);
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }

    // Skip AI agent on initial mount — don't fire for pre-existing messages
    if (!aiInitializedRef.current) {
      aiInitializedRef.current = true;
      return;
    }

    // === Proactive AI Agent (FT MAVERIICK) — Real AI calls ===
    if (aiAgentActive && activeRoomId && messages.length > 0) {
      const humanMessages = messages.filter(m => m.senderId !== 'ft_maverick');
      
      if (humanMessages.length > 0 && humanMessages.length % 4 === 0) {
        if (aiAgentTimeoutRef.current) clearTimeout(aiAgentTimeoutRef.current);
        
        aiAgentTimeoutRef.current = setTimeout(async () => {
          const lastHuman = humanMessages[humanMessages.length - 1];
          const addressMatch = lastHuman.content.match(/0x[a-fA-F0-9]{40}/);
          
          const prompt = addressMatch 
            ? `You are FT MAVERIICK, an expert blockchain investigator in a group chat. A user just mentioned ${addressMatch[0]}. Give one short, actionable lead about this address (max 1 sentence).`
            : `You are FT MAVERIICK in a group investigation chat. Give one short, useful lead or question based on the recent conversation (max 1 sentence).`;

          try {
            const reply = await fetchSSE({ question: prompt });
            await send(`@FT MAVERIICK ${reply || 'I have some thoughts on this.'}`);
          } catch {
            await send(`@FT MAVERIICK I noticed some interesting patterns. Want me to dig deeper?`);
          }
        }, 4500);
      }
    }
  }, [messages, aiAgentActive, activeRoomId, send]);

  // Command palette keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.key === 'Escape' && showCommandPalette) {
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette]);

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

  const handleReact = useCallback((messageId: string, emoji: string) => {
    setReactions(prev => {
      const msgReactions = { ...(prev[messageId] || {}) };
      if (!msgReactions[emoji]) msgReactions[emoji] = [];
      if (!msgReactions[emoji].includes(user?.uid || '')) {
        msgReactions[emoji].push(user?.uid || '');
      }
      const newState = { ...prev, [messageId]: msgReactions };
      
      // Persist
      if (activeRoomId) {
        localStorage.setItem(`ft_reactions_${activeRoomId}`, JSON.stringify(newState));
      }
      return newState;
    });
  }, [user?.uid, activeRoomId]);

  const handleInvite = useCallback(async () => {
    if (!activeRoomId) return;
    try {
      const data = await createInvite(activeRoomId);
      const url = data.inviteUrl || data.url;
      if (url) {
        setInviteUrl(url);
        setShowInvite(true);
      }
    } catch {
      // fail silently
    }
  }, [activeRoomId]);

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

  // Clean up processing timeout on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
    };
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
              animate={{ opacity: 0.92 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ backdropFilter: 'blur(20px)' }}
            />

            <motion.div
              className="ir-panel"
              initial={{ opacity: 0, scale: 0.985, y: 16, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.985, y: 16, filter: 'blur(4px)' }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
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
                     + New Room
                   </button>
                </div>
              )}

               {/* Online Presence + AI Agent */}
               <div className="ir-presence-row">
                 {members.slice(0, 5).map((m, idx) => (
                   <div key={idx} className="ir-presence-avatar" title={m.displayName}>
                     {m.photoURL ? <img src={m.photoURL} alt="" /> : m.displayName[0]}
                     <span className="ir-presence-dot" />
                   </div>
                 ))}
                 {members.length > 5 && <span className="ir-presence-more">+{members.length - 5}</span>}
                 
                 {/* AI Agent Status */}
                 <div 
                   className={`ir-ai-agent-badge ${aiAgentActive ? 'active' : ''}`}
                   onClick={() => setAiAgentActive(!aiAgentActive)}
                   title={aiAgentActive ? 'FT MAVERIICK is actively suggesting leads' : 'AI Agent is paused'}
                 >
                   🤖 FT MAVERIICK {aiAgentActive ? 'ON' : 'OFF'}
                 </div>
               </div>

               <RoomHeader
                 name={roomDetails?.name || 'Investigation Room'}
                 memberCount={members.length}
                 onInvite={handleInvite}
                 onClose={onClose}
                 showExport={!!user}
                 onAISummary={async () => {
                   setIsProcessingAi(true);
                   try {
                     const reply = await fetchSSE({ question: 'Summarize the last 20 messages in this investigation room in 4 bullet points.' });
                     await send('@FT MAVERIICK Room Summary:\n' + (reply || 'Summary generated.'));
                   } catch {}
                   setIsProcessingAi(false);
                 }}
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
                           <EvidenceKanban
                             pinnedMessages={pins}
                             onUnpin={handleUnpin}
                             roomId={activeRoomId}
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

      <InviteDialog
        isOpen={showInvite}
        inviteUrl={inviteUrl}
        roomName={roomDetails?.name || 'Investigation Room'}
        onClose={() => setShowInvite(false)}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onCreateRoom={() => {
          setShowCommandPalette(false);
          setShowCreateModal(true);
        }}
        onScrollToBottom={() => {
          setShowCommandPalette(false);
          // scroll logic handled in ChatMessageList
        }}
        currentRoomId={activeRoomId}
      />
    </>
  );
}

export default InvestigationRoomView;
