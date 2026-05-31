import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useRoomMessages } from '../../../hooks/useRoomMessages';
import { useRoomPins } from '../../../hooks/useRoomPins';
import { useMentionAutocomplete } from '../../../hooks/useMentionAutocomplete';
import { useInvestigationSocket } from '../../../hooks/useInvestigationSocket';
import { on } from '../../../lib/investigationSocket';
import {
  getRoomDetails,
  createInvite,
  removeMember,
  promoteMember,
  leaveRoom,
  createRoom,
  getRooms,
  sendAiResponse,
  updateRoom,
  deleteRoom as deleteRoomApi,
  getInvite,
  joinRoom,
} from '../../../api';
import { RoomHeader } from './RoomHeader';
import { RoomLayout } from './RoomLayout';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { SidebarTabs, SidebarTab } from './SidebarTabs';
import { RecentScansList } from './RecentScansList';
import { getHistory } from '../../../utils/history';
import { EvidenceKanban } from './EvidenceKanban';
import { MemberList } from './MemberList';
import { CreateRoomModal } from './CreateRoomModal';
import { InviteDialog } from './InviteDialog';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { API_BASE } from '../../../api';
import { CommandPalette } from './CommandPalette';
import { ReplyBar } from './ReplyBar';
import { useNotify } from '../../../contexts/ToastContext';
import { MessageReactions } from './MessageReactions';
import { RoomSettingsModal } from './RoomSettingsModal';
import { buildContextFromTable } from '../AiFullScreenView';
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

function extractChainFromMessage(text: string): string | null {
  const lower = text.toLowerCase();
  const chainAliases: [string, string[]][] = [
    ['ethereum', ['ethereum', 'eth']],
    ['base', ['base']],
    ['arbitrum', ['arbitrum', 'arb']],
    ['optimism', ['optimism', 'opt', 'op mainnet']],
    ['polygon', ['polygon', 'matic']],
    ['linea', ['linea']],
    ['bsc', ['bsc', 'binance']],
  ];
  for (const [chain, aliases] of chainAliases) {
    for (const alias of aliases) {
      if (new RegExp(`(^|\\s)(on|in|for|using)\\s+${alias}(\\s|$|,|\\.)`, 'i').test(text)) {
        return chain;
      }
    }
  }
  return null;
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

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');

  // Join by code
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinLookupLoading, setJoinLookupLoading] = useState(false);
  const [joinLookupInfo, setJoinLookupInfo] = useState<{ roomId: string; roomName: string } | null>(null);
  const [joinLookupError, setJoinLookupError] = useState('');

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // Chat input
  const [inputValue, setInputValue] = useState('');
  const [inputCursor, setInputCursor] = useState(0);

  // Sidebar tab
  const [activeTab, setActiveTab] = useState<SidebarTab>('recents');

  // Processing AI
  const [isProcessingAi, setIsProcessingAi] = useState(false);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stores the last analysis context text so follow-up AI questions have context
  const [lastAnalysisContext, setLastAnalysisContext] = useState<string | null>(null);

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

  // Recent scans from global history
  const [recentScans, setRecentScans] = useState<any[]>(() => getHistory());

  // Refresh recent scans when history changes
  useEffect(() => {
    const handler = () => setRecentScans([...getHistory()]);
    window.addEventListener('historyChanged', handler);
    return () => window.removeEventListener('historyChanged', handler);
  }, []);

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

  // Listen for room updates (member join/leave) via WebSocket
  useEffect(() => {
    const unsub = on('room_update', async (data: any) => {
      if (!data.roomId || data.roomId !== activeRoomId) return;
      if (data.event === 'member_joined' || data.event === 'member_left' || data.event === 'member_removed') {
        try {
          const details = await getRoomDetails(activeRoomId);
          if (details) {
            setRoomDetails(details);
            setMembers(details.members || []);
          }
        } catch {
          // fail silently
        }
      }
    });
    return unsub;
  }, [activeRoomId]);

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
    const isAiMention = val.toLowerCase().includes('@ft maveriick');
    if (!isAiMention || !activeRoomId) return;

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
          body: JSON.stringify({ address, chain: extractChainFromMessage(val) || roomDetails?.seedChain || currentChain || 'ethereum' }),
        });

        if (!res.ok) throw new Error('Analysis failed');

        const data = await res.json();
        const a = data.analysis || {};
        const chain = extractChainFromMessage(val) || roomDetails?.seedChain || currentChain || 'ethereum';

        // Build structured table data (same format AiFullScreenView uses)
        const tableData = {
          address,
          chain,
          type: 'wallet' as const,
          riskScore: a.riskScore,
          riskLevel: a.riskLevel,
          totalTransactions: a.totalTransactions,
          totalValueSent: a.totalValueSentEth,
          totalValueReceived: a.totalValueReceivedEth,
          balance: a.balance,
          flags: a.flags,
          topInteractions: a.topInteractions,
          fundingSources: a.fundingSources,
        };

        const summary = [
          `**FT MAVERIICK Analysis** — \`${address}\``,
          `• Risk: **${a.riskLevel || 'unknown'}** (score: ${a.riskScore ?? 'N/A'})`,
          `• Transactions: ${a.totalTransactions ?? 0}`,
          a.balance != null ? `• Balance: ${Number(a.balance).toFixed(4)} ETH` : null,
          a.totalValueSentEth != null ? `• Total sent: ${Number(a.totalValueSentEth).toFixed(2)} ETH` : null,
          a.totalValueReceivedEth != null ? `• Total received: ${Number(a.totalValueReceivedEth).toFixed(2)} ETH` : null,
          a.flags?.length ? `• Flags: ${a.flags.join(', ')}` : null,
        ].filter(Boolean).join('\n');

        await sendAiResponse(activeRoomId, summary, {
          command: 'analyze',
          address,
          chain,
          resultSummary: summary,
          resultData: tableData,
        });

        // Store analysis context for follow-up AI questions
        setLastAnalysisContext(buildContextFromTable(tableData));
      } else {
        // No address — ask AI directly with context from last analysis + recent room messages
        const recentMessages = messages.slice(-20).map(m => ({
          role: (m.senderId === 'ft_maverick' || m.senderName === 'FT MAVERIICK') ? 'assistant' : 'user',
          content: m.content || '',
        }));
        const history = lastAnalysisContext
          ? [{ role: 'system' as const, content: lastAnalysisContext }, ...recentMessages]
          : recentMessages;
        const reply = await fetchSSE({
          question: val.replace(/@FT\s+MAVERIICK/i, '').trim() || 'Analyze the current investigation context.',
          history,
        });
        if (reply) {
          await sendAiResponse(activeRoomId, reply);
        }
      }
    } catch {
      await sendAiResponse(activeRoomId, 'Analysis failed. Please try again with a valid wallet address.');
    }

    setIsProcessingAi(false);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, [inputValue, send, replyingTo, roomDetails?.seedChain, currentChain, fetchSSE, activeRoomId]);

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
  }, [messages]);

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

  const handleScanSelect = useCallback(async (scan: any) => {
    if (!activeRoomId) return;
    setIsProcessingAi(true);
    try {
      const token = localStorage.getItem('fundtracer_token');
      const res = await fetch(`${API_BASE}/api/ai-chat/analyze-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ address: scan.address, chain: scan.chain || 'ethereum' }),
      });
      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      const a = data.analysis || {};
      const chain = scan.chain || 'ethereum';

      const tableData = {
        address: scan.address,
        chain,
        type: 'wallet' as const,
        riskScore: a.riskScore,
        riskLevel: a.riskLevel,
        totalTransactions: a.totalTransactions,
        totalValueSent: a.totalValueSentEth,
        totalValueReceived: a.totalValueReceivedEth,
        balance: a.balance,
        flags: a.flags,
        topInteractions: a.topInteractions,
        fundingSources: a.fundingSources,
      };

      const summary = [
        `**FT MAVERIICK Analysis** — \`${scan.address}\``,
        `• Risk: **${a.riskLevel || 'unknown'}** (score: ${a.riskScore ?? 'N/A'})`,
        `• Transactions: ${a.totalTransactions ?? 0}`,
        a.balance != null ? `• Balance: ${Number(a.balance).toFixed(4)} ETH` : null,
        a.totalValueSentEth != null ? `• Total sent: ${Number(a.totalValueSentEth).toFixed(2)} ETH` : null,
        a.totalValueReceivedEth != null ? `• Total received: ${Number(a.totalValueReceivedEth).toFixed(2)} ETH` : null,
        a.flags?.length ? `• Flags: ${a.flags.join(', ')}` : null,
      ].filter(Boolean).join('\n');

      await sendAiResponse(activeRoomId, summary, {
        command: 'analyze',
        address: scan.address,
        chain,
        resultSummary: summary,
        resultData: tableData,
      });

      setLastAnalysisContext(buildContextFromTable(tableData));
    } catch {
      notify.error('Failed to analyze wallet');
    }
    setIsProcessingAi(false);
  }, [activeRoomId, notify, sendAiResponse]);

  const handleInvite = useCallback(async () => {
    if (!activeRoomId) return;
    try {
      const data = await createInvite(activeRoomId);
      const code = data.inviteCode;
      if (code) {
        const url = `${window.location.origin}/app-evm?invite=${code}`;
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

  const handleUpdateDescription = useCallback(async (description: string) => {
    if (!activeRoomId) return;
    await updateRoom(activeRoomId, { description });
    setRoomDetails(prev => prev ? { ...prev, description } : prev);
  }, [activeRoomId]);

  const handleDeleteRoom = useCallback(async () => {
    if (!activeRoomId) return;
    try {
      await deleteRoomApi(activeRoomId);
      setRooms(prev => prev.filter(r => r.id !== activeRoomId));
      setActiveRoomId(null);
      setShowSettings(false);
    } catch {
      // fail silently
    }
  }, [activeRoomId]);

  const handleLeaveRoom = useCallback(async () => {
    if (!activeRoomId) return;
    try {
      await leaveRoom(activeRoomId);
      setRooms(prev => prev.filter(r => r.id !== activeRoomId));
      setActiveRoomId(null);
      setShowSettings(false);
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

  const extractInviteCode = useCallback((input: string): string => {
    try { const url = new URL(input); return url.searchParams.get('invite') || ''; }
    catch { return input.trim(); }
  }, []);

  const handleJoinLookup = useCallback(async () => {
    const code = extractInviteCode(joinCodeInput);
    if (!code) return;
    setJoinLookupLoading(true);
    setJoinLookupError('');
    try {
      const info = await getInvite(code);
      if (info?.invite) setJoinLookupInfo(info.invite);
    } catch (err: any) {
      setJoinLookupError(err.message || 'Invalid or expired invite code');
    } finally { setJoinLookupLoading(false); }
  }, [joinCodeInput, extractInviteCode]);

  const handleJoinConfirm = useCallback(async () => {
    if (!joinLookupInfo) return;
    setJoinLookupLoading(true);
    setJoinLookupError('');
    try {
      await joinRoom(joinLookupInfo.roomId, extractInviteCode(joinCodeInput));
      setShowJoinByCode(false);
      setJoinCodeInput('');
      setJoinLookupInfo(null);
      const list = await getRooms();
      setRooms(list);
    } catch (err: any) {
      setJoinLookupError(err.message || 'Failed to join room');
    } finally { setJoinLookupLoading(false); }
  }, [joinLookupInfo, joinCodeInput, extractInviteCode]);

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
                   <button
                     className="ir-room-tab-new"
                     onClick={() => { setShowJoinByCode(true); setJoinCodeInput(''); setJoinLookupInfo(null); setJoinLookupError(''); }}
                     style={{ marginLeft: 4 }}
                   >
                     + Join Room
                   </button>
                </div>
              )}

              {/* Join by code dialog */}
              {showJoinByCode && (
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  {joinLookupInfo ? (
                    <>
                      <p style={{ fontSize: 13, marginBottom: 8 }}>Join <strong>{joinLookupInfo.roomName}</strong>?</p>
                      {joinLookupError && <p style={{ fontSize: 11, color: 'var(--destructive)', marginBottom: 8 }}>{joinLookupError}</p>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="ir-empty-btn" onClick={handleJoinConfirm} disabled={joinLookupLoading}>
                          {joinLookupLoading ? 'Joining...' : 'Join'}
                        </button>
                        <button className="ir-room-tab-new" onClick={() => { setShowJoinByCode(false); setJoinCodeInput(''); setJoinLookupInfo(null); }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <input
                        type="text" value={joinCodeInput}
                        onChange={e => setJoinCodeInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleJoinLookup(); if (e.key === 'Escape') { setShowJoinByCode(false); setJoinCodeInput(''); } }}
                        placeholder="Paste invite link or code..."
                        autoFocus
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 12 }}
                      />
                      {joinLookupError && <p style={{ fontSize: 11, color: 'var(--destructive)', marginTop: 6 }}>{joinLookupError}</p>}
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="ir-empty-btn" onClick={handleJoinLookup} disabled={joinLookupLoading || !joinCodeInput.trim()}>
                          {joinLookupLoading ? 'Looking up...' : 'Look Up'}
                        </button>
                        <button className="ir-room-tab-new" onClick={() => { setShowJoinByCode(false); setJoinCodeInput(''); setJoinLookupError(''); }}>
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
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
               </div>

               <RoomHeader
                 name={roomDetails?.name || 'Investigation Room'}
                 memberCount={members.length}
                 onSettings={() => setShowSettings(true)}
                 onClose={onClose}
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
                        {activeTab === 'recents' && (
                          <RecentScansList
                            scans={recentScans}
                            onSelectScan={handleScanSelect}
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
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button className="ir-empty-btn" onClick={() => setShowCreateModal(true)}>
                      Create Your First Room
                    </button>
                    <button className="ir-empty-btn" onClick={() => { setShowJoinByCode(true); setJoinCodeInput(''); setJoinLookupInfo(null); setJoinLookupError(''); }}>
                      Join a Room
                    </button>
                  </div>
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

      <RoomSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        roomName={roomDetails?.name || 'Investigation Room'}
        roomDescription={roomDetails?.description}
        roomId={activeRoomId || ''}
        members={members}
        currentUserId={user?.uid}
        currentUserRole={currentUserRole}
        onInvite={() => {
          setShowSettings(false);
          handleInvite();
        }}
        onRemoveMember={handleRemoveMember}
        onPromoteMember={handlePromoteMember}
        onDeleteRoom={handleDeleteRoom}
        onUpdateDescription={handleUpdateDescription}
        onLeaveRoom={handleLeaveRoom}
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
