import { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Users, Plus, Hash, Bot, Settings, X, Copy, Link, RefreshCw, Loader2, ArrowLeft, ImageIcon, Mic, Check, History } from 'lucide-react';
import { getRooms, getRoom, getRoomMessages, sendRoomMessage, sendAiResponse, createRoom, inviteToRoom, updateRoom, deleteRoom, leaveRoom, removeRoomMember, lookupInvite, joinRoom, connectRoomSocket, disconnectRoomSocket, onRoomEvent, sendWsEvent, normalizeMessage, type InvestigationRoom, type RoomMessage } from '../../api/rooms';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { sendChatMessage } from '../../api/chat';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/ToastContext';
import { MarkdownContent } from '../analysis/MarkdownContent';
import { getHistory, onHistoryChange } from '../../stores/history';

export function RoomsView() {
  const { profile } = useAuth();
  const notify = useNotify();
  const [rooms, setRooms] = useState<InvestigationRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<InvestigationRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescValue, setEditDescValue] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [roomSelecting, setRoomSelecting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [mentionMode, setMentionMode] = useState<'off' | 'active'>('off');
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const historyPickerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinInfo, setJoinInfo] = useState<{ roomId: string; roomName: string } | null>(null);
  const [joinError, setJoinError] = useState('');

  const [typingUsers, setTypingUsers] = useState<Map<string, { displayName: string; timestamp: number }>>(new Map());
  const [aiTyping, setAiTyping] = useState(false);
  const typingSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Plus menu / attachments / voice
  const [attachedImages, setAttachedImages] = useState<Array<{ name: string; dataUrl: string; size: number }>>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showHistoryPicker, setShowHistoryPicker] = useState(false);
  const [scanHistory, setScanHistory] = useState<ReturnType<typeof getHistory>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);

  // Double-tap detection for mobile voice notes
  const lastTapRef = useRef(0);
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { loadRooms(); }, []);

  // Load scan history and subscribe
  useEffect(() => {
    setScanHistory(getHistory());
    return onHistoryChange(() => setScanHistory(getHistory()));
  }, []);

  // Click outside to close plus menu and history picker
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) setShowPlusMenu(false);
      if (historyPickerRef.current && !historyPickerRef.current.contains(e.target as Node)) setShowHistoryPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadRooms = async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const list = await getRooms();
      setRooms(list);
    } catch (err: any) {
      setRoomsError(err?.message || 'Failed to load rooms');
    } finally {
      setRoomsLoading(false);
    }
  };

  // Build member name lookup from active room + current user
  const memberMap = useMemo(() => {
    const map = new Map<string, string>();
    // Include current user first
    if (profile?.uid) {
      map.set(profile.uid, profile.displayName || profile.name || profile.username || 'You');
    }
    if (activeRoom?.members) {
      for (const m of activeRoom.members) {
        const name = m.displayName || map.get(m.uid);
        if (name) map.set(m.uid, name);
      }
    }
    return map;
  }, [activeRoom?.members, profile]);

  const getSenderName = (sender: any): string => {
    if (!sender) return 'Unknown';
    if (typeof sender === 'string') return memberMap.get(sender) || `${sender.slice(0, 6)}...${sender.slice(-4)}`;
    const name = sender.displayName || sender.name || sender.username || (sender.uid ? memberMap.get(sender.uid) : null);
    return name || (sender.uid ? `${sender.uid.slice(0, 6)}...${sender.uid.slice(-4)}` : 'Unknown');
  };

  const getSenderUid = (sender: any): string | null => {
    if (!sender) return null;
    if (typeof sender === 'string') return sender;
    return sender.uid || null;
  };

  const selectRoom = async (room: InvestigationRoom) => {
    setActiveRoom(room);
    setMessages([]);
    setShowInvite(false);
    setInviteLink(null);
    setInviteCode(null);
    setRoomSelecting(true);
    if (isMobile) setMobileView('chat');
    connectRoomSocket(room.id);
    try {
      const [fullRoom, msgs] = await Promise.all([
        getRoom(room.id).catch(() => room),
        getRoomMessages(room.id).catch(() => [] as RoomMessage[]),
      ]);
      setActiveRoom(fullRoom);
      setRooms(prev => prev.map(r => r.id === fullRoom.id ? fullRoom : r));
      setMessages(msgs);
    } catch { setMessages([]); }
    finally { setRoomSelecting(false); }
  };

  // Listen for real-time messages and typing from WebSocket
  useEffect(() => {
    if (!activeRoom?.id) return;

    const unsubs: (() => void)[] = [];

    unsubs.push(onRoomEvent('message', (data: any) => {
      const msg = normalizeMessage(data.message || data);
      if (msg.roomId === activeRoom.id && msg.sender && msg.content) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    }));

    unsubs.push(onRoomEvent('typing', (data: any) => {
      if (data.uid && data.displayName && data.uid !== profile?.uid) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.set(data.uid, { displayName: data.displayName, timestamp: Date.now() });
          return next;
        });
      }
    }));

    // Handle real ID updates from server persistence
    unsubs.push(onRoomEvent('message_id_update', (data: any) => {
      if (data.tempId && data.realId) {
        setMessages(prev => prev.map(m => m.id === data.tempId ? { ...m, id: data.realId } : m));
      }
    }));

    // Handle room updates (member join/leave, metadata changes)
    unsubs.push(onRoomEvent('room_update', (data: any) => {
      if (!data.roomId) return;

      if (data.event === 'member_joined' && data.member) {
        setActiveRoom(prev => {
          if (!prev || prev.id !== data.roomId) return prev;
          const exists = prev.members?.some(m => m.uid === data.member.uid);
          if (exists) return prev;
          return {
            ...prev,
            memberCount: (prev.memberCount || 0) + 1,
            members: [...(prev.members || []), data.member],
          };
        });
        setRooms(prev => prev.map(r =>
          r.id === data.roomId ? { ...r, memberCount: (r.memberCount || 0) + 1 } : r
        ));
      } else if (data.event === 'member_left' && data.uid) {
        setActiveRoom(prev => {
          if (!prev || prev.id !== data.roomId) return prev;
          return {
            ...prev,
            memberCount: Math.max(0, (prev.memberCount || 0) - 1),
            members: (prev.members || []).filter(m => m.uid !== data.uid),
          };
        });
        setRooms(prev => prev.map(r =>
          r.id === data.roomId ? { ...r, memberCount: Math.max(0, (r.memberCount || 0) - 1) } : r
        ));
      } else if (data.roomId === activeRoom?.id) {
        // Generic refresh for other events
        getRoom(activeRoom.id).then(updated => {
          setActiveRoom(updated);
          setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
        }).catch(() => {});
      }
    }));

    return () => {
      unsubs.forEach(u => u());
      disconnectRoomSocket();
    };
  }, [activeRoom?.id]);

  // Clean up stale typing indicators after 5s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [uid, data] of next) {
          if (now - data.timestamp > 5000) { next.delete(uid); changed = true; }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, aiTyping, typingUsers.size, activeRoom?.id]);

  // ─── Image attachment ────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setShowPlusMenu(false);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImages(prev => [...prev, {
          name: file.name,
          dataUrl: reader.result as string,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Voice recording ──────────────────────────────────────

  const startRecording = async () => {
    setShowPlusMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        // Read as data URL so CSP doesn't block blob: URLs
        const reader = new FileReader();
        reader.onload = () => {
          setAudioBlob(blob);
          setAudioDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
        setIsRecording(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioDataUrl(null);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      notify.error('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingTime(0);
      setAudioDataUrl(null);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const sendVoiceNote = async () => {
    if (!audioBlob || !audioDataUrl || !activeRoom) return;
    const audioHtml = `<audio controls src="${audioDataUrl}" style="max-width:100%"></audio>`;
    await sendMessageContent(audioHtml);
    setAudioBlob(null);
    setAudioDataUrl(null);
    setRecordingTime(0);
  };

  // ─── Scan history ─────────────────────────────────────────

  const insertScanHistory = (entry: ReturnType<typeof getHistory>[0]) => {
    setShowHistoryPicker(false);
    setShowPlusMenu(false);
    const addressShort = `${entry.address.slice(0, 8)}...${entry.address.slice(-6)}`;
    const riskEmoji = entry.riskLevel === 'high' ? '🔴' : entry.riskLevel === 'medium' ? '🟡' : entry.riskLevel === 'low' ? '🟢' : '⚪';
    const table = [
      `**Scan History** — [View on Explorer](https://etherscan.io/address/${entry.address})`,
      '',
      '| Field | Value |',
      '| --- | --- |',
      `| Address | \`${addressShort}\` |`,
      `| Chain | ${entry.chain} |`,
      `| Type | ${entry.type || 'N/A'} |`,
      `| Risk | ${riskEmoji} ${entry.riskLevel || 'N/A'} (${entry.riskScore != null ? entry.riskScore + '/100' : 'N/A'}) |`,
      `| Transactions | ${entry.totalTransactions != null ? `${entry.totalTransactions}${entry.transactionHistoryLimited ? '+' : ''}` : 'N/A'} |`,
    ];
    if (entry.totalValueSentEth != null) table.push(`| Value Sent | ${entry.totalValueSentEth} ETH |`);
    if (entry.totalValueReceivedEth != null) table.push(`| Value Received | ${entry.totalValueReceivedEth} ETH |`);
    if (entry.balanceInEth != null) table.push(`| Balance | ${entry.balanceInEth} ETH |`);
    if (entry.activityPeriodDays != null) table.push(`| Activity | ${entry.activityPeriodDays} days |`);
    sendMessageContent(table.join('\n'));
  };

  // ─── Shared send helper ────────────────────────────────────

  const sendMessageContent = async (content: string) => {
    if (!activeRoom || loading) return;
    sendWsEvent({ type: 'typing_stop' });
    typingSentRef.current = false;
    setLoading(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: RoomMessage = {
      id: tempId,
      roomId: activeRoom.id,
      sender: { uid: profile?.uid || '', displayName: profile?.displayName || profile?.name || 'You' },
      content,
      timestamp: Date.now(),
      type: 'message',
    };
    setMessages(prev => [...prev, optimistic]);

    // Fire-and-forget via WebSocket for near-instant delivery to other members
    sendWsEvent({ type: 'chat_message', content, roomId: activeRoom.id, tempId });

    try {
      const msg = await sendRoomMessage(activeRoom.id, content);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== msg.id);
        return filtered.map(m => m.id === tempId ? msg : m);
      });

      if (/@(ai|fundtracer|assistant|ft)\b/i.test(content)) {
        setAiTyping(true);
        try {
          const aiReply = await sendChatMessage(null, content, undefined, undefined);
          const aiMsg = await sendAiResponse(activeRoom.id, aiReply.reply);
          setMessages(prev => [...prev, aiMsg]);
        } catch {}
        finally { setAiTyping(false); }
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      notify.error('Failed to send message');
    }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0 && !audioBlob) || !activeRoom || loading) return;

    // If voice note is recorded, send it
    if (audioBlob) {
      await sendVoiceNote();
      return;
    }

    // Build message content with images
    let content = text;
    if (attachedImages.length > 0) {
      const imageLines = attachedImages.map(img => `![${img.name}](${img.dataUrl})`).join('\n');
      content = content ? content + '\n' + imageLines : imageLines;
    }

    setInput('');
    setAttachedImages([]);
    await sendMessageContent(content);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    try {
      const room = await createRoom(newRoomName.trim());
      setRooms(prev => [room, ...prev]);
      setNewRoomName('');
      setShowCreate(false);
      selectRoom(room);
    } catch { notify.error('Failed to create room'); }
  };

  const extractInviteCode = (input: string): string => {
    // If it's a full URL, extract the code from ?invite= parameter
    try {
      const url = new URL(input);
      return url.searchParams.get('invite') || '';
    } catch {
      // Not a URL, treat as raw code
      return input.trim();
    }
  };

  const handleLookupInvite = async () => {
    const code = extractInviteCode(joinCode);
    if (!code) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      const info = await lookupInvite(code);
      setJoinInfo(info);
    } catch (err: any) {
      setJoinError(err.message || 'Invalid or expired invite code');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!joinInfo) return;
    setJoinLoading(true);
    setJoinError('');
    try {
      await joinRoom(joinInfo.roomId, extractInviteCode(joinCode));
      notify.success(`Joined ${joinInfo.roomName}`);
      const roomId = joinInfo.roomId;
      const roomName = joinInfo.roomName;
      setShowJoin(false);
      setJoinCode('');
      setJoinInfo(null);
      const list = await getRooms();
      setRooms(list);
      // Auto-select the newly joined room
      const joined = list.find(r => r.id === roomId);
      if (joined) selectRoom(joined);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join room');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleGetInviteLink = async () => {
    if (!activeRoom) return;
    setInviting(true);
    try {
      const { inviteCode: code, url } = await inviteToRoom(activeRoom.id, '');
      setInviteLink(url);
      setInviteCode(code);
      setShowInvite(true);
      await navigator.clipboard.writeText(url);
      notify.success('Invite link copied!');
    } catch { notify.error('Failed to generate invite link'); }
    finally { setInviting(false); }
  };

  const handleUpdateDescription = async () => {
    if (!activeRoom) return;
    try {
      await updateRoom(activeRoom.id, { description: editDescValue });
      setActiveRoom(prev => prev ? { ...prev, description: editDescValue } : prev);
      setRooms(prev => prev.map(r => r.id === activeRoom.id ? { ...r, description: editDescValue } : r));
      setEditingDescription(false);
    } catch { notify.error('Failed to update description'); }
  };

  const handleRemoveMember = async (uid: string) => {
    if (!activeRoom) return;
    try {
      await removeRoomMember(activeRoom.id, uid);
      const updated = await getRoom(activeRoom.id);
      setActiveRoom(updated);
      setRooms(prev => prev.map(r => r.id === updated.id ? updated : r));
      notify.success('Member removed');
    } catch { notify.error('Failed to remove member'); }
  };

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    try {
      await leaveRoom(activeRoom.id);
      setRooms(prev => prev.filter(r => r.id !== activeRoom.id));
      setActiveRoom(null);
      setMessages([]);
      setShowRoomSettings(false);
      notify.success('Left room');
    } catch { notify.error('Failed to leave room'); }
  };

  const handleDeleteRoom = async () => {
    if (!activeRoom) return;
    setDeleting(true);
    try {
      await deleteRoom(activeRoom.id);
      setRooms(prev => prev.filter(r => r.id !== activeRoom.id));
      setActiveRoom(null);
      setMessages([]);
      setShowRoomSettings(false);
      notify.success('Room deleted');
    } catch { notify.error('Failed to delete room'); }
    finally { setDeleting(false); }
  };

  const isOwner = activeRoom?.createdBy === profile?.uid;
  const isAdmin = isOwner || activeRoom?.members?.some(m => m.uid === profile?.uid && m.role === 'admin');

  // Build mentionable members list (for @ autocomplete)
  const mentionableMembers = useMemo(() => {
    const list: Array<{ uid: string; displayName: string }> = [];
    if (profile?.uid) {
      list.push({ uid: profile.uid, displayName: profile.displayName || profile.name || 'You' });
    }
    // AI bot
    list.push({ uid: 'ft_maverick', displayName: 'FT MAVERIICK' });
    if (activeRoom?.members) {
      for (const m of activeRoom.members) {
        if (!list.find(x => x.uid === m.uid)) {
          list.push({ uid: m.uid, displayName: m.displayName || m.uid.slice(0, 6) + '...' + m.uid.slice(-4) });
        }
      }
    }
    return list;
  }, [activeRoom?.members, profile]);

  const filteredMentions = useMemo(() => {
    if (mentionMode !== 'active') return [];
    const q = mentionFilter.toLowerCase();
    return mentionableMembers
      .filter(m => m.displayName.toLowerCase().includes(q) || m.uid.toLowerCase().includes(q))
      .slice(0, 8);
  }, [mentionMode, mentionFilter, mentionableMembers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    // Send typing_start over WebSocket (server debounces at 3s)
    if (val && !typingSentRef.current) {
      typingSentRef.current = true;
      sendWsEvent({ type: 'typing_start' });
      setTimeout(() => { typingSentRef.current = false; }, 3000);
    }
    if (!val) {
      typingSentRef.current = false;
      sendWsEvent({ type: 'typing_stop' });
    }

    // Detect @mention trigger
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);

    if (atMatch) {
      setMentionMode('active');
      setMentionFilter(atMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionMode('off');
      setMentionFilter('');
    }
  };

  const insertMention = (member: { uid: string; displayName: string }) => {
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');
    if (atIdx === -1) return;

    const newBefore = textBeforeCursor.slice(0, atIdx) + `@${member.displayName} `;
    const newInput = newBefore + textAfterCursor;
    setInput(newInput);
    setMentionMode('off');
    setMentionFilter('');
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionMode === 'active' && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredMentions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionMode('off');
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChatFeedDoubleTap = () => {
    if (!isMobile || isRecording || !activeRoom) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      // Double tap detected
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
      lastTapRef.current = 0;
      startRecording();
    } else {
      lastTapRef.current = now;
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current);
      doubleTapTimerRef.current = setTimeout(() => { lastTapRef.current = 0; }, 400);
    }
  };

  return (
    <div className="ft-room-panel" style={{ display: 'flex', height: '100%', minWidth: 0, overflow: 'hidden', border: 0, borderRadius: 0 }}>
      <style>{`
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes typing-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.typing-dots { animation: typing-pulse 1.2s ease-in-out infinite; }
@keyframes ft-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.75); }
}
@keyframes ft-scale-in {
  0% { opacity: 0; transform: scale(0.92); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes ft-fade-up {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes ft-announce-in {
  0% { opacity: 0; transform: translateY(-4px); }
  100% { opacity: 0.75; transform: translateY(0); }
}
`}</style>
      {/* Room list */}
      <div style={{ width: isMobile ? '100%' : 300, borderRight: isMobile ? 'none' : '1px solid var(--hairline)', display: isMobile && mobileView === 'chat' ? 'none' : 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--hairline)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Rooms</span>
            {rooms.length > 0 && <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', background: 'var(--hover-overlay)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>{rooms.length}</span>}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => { setShowJoin(true); setJoinCode(''); setJoinInfo(null); setJoinError(''); }}
              title="Join room by invite code"
              style={{ padding: 4, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer' }}>
              <Link size={16} />
            </button>
            <button onClick={() => setShowCreate(true)}
              style={{ padding: 4, borderRadius: 'var(--radius-md)', border: 'none', background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Create room modal */}
        {showCreate && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <input
              type="text" value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom(); if (e.key === 'Escape') setShowCreate(false); }}
              placeholder="Room name..."
              autoFocus
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--card-border)', background: 'var(--card)',
                color: 'var(--fg)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button onClick={handleCreateRoom}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none', fontSize: 11, fontWeight: 600,
                  background: 'var(--accent)', color: 'var(--accent-ink)', cursor: 'pointer',
                }}>Create</button>
              <button onClick={() => setShowCreate(false)}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', fontSize: 11,
                  background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer',
                }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Join room dialog */}
        {showJoin && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
            {joinInfo ? (
              <>
                <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginBottom: 8 }}>
                  Join <strong>{joinInfo.roomName}</strong>?
                </div>
                {joinError && <div style={{ fontSize: 11, color: 'var(--destructive)', marginBottom: 8 }}>{joinError}</div>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleConfirmJoin} disabled={joinLoading}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none', fontSize: 11, fontWeight: 600,
                      background: 'var(--accent)', color: 'var(--accent-ink)', cursor: 'pointer',
                    }}>
                    {joinLoading ? 'Joining...' : 'Join'}
                  </button>
                  <button onClick={() => { setShowJoin(false); setJoinCode(''); setJoinInfo(null); }}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', fontSize: 11,
                      background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer',
                    }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <input
                  type="text" value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleLookupInvite(); if (e.key === 'Escape') { setShowJoin(false); setJoinCode(''); } }}
                  placeholder="Paste invite link or code..."
                  autoFocus
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--card-border)', background: 'var(--card)',
                    color: 'var(--fg)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
                />
                {joinError && <div style={{ fontSize: 11, color: 'var(--destructive)', marginTop: 6 }}>{joinError}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <button onClick={handleLookupInvite} disabled={joinLoading || !joinCode.trim()}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-md)', border: 'none', fontSize: 11, fontWeight: 600,
                      background: joinCode.trim() ? 'var(--accent)' : 'var(--hover-overlay)',
                      color: joinCode.trim()  ? 'var(--accent-ink)' : 'var(--fg-tertiary)',
                      cursor: joinCode.trim() ? 'pointer' : 'default',
                    }}>
                    {joinLoading ? 'Looking up...' : 'Look Up'}
                  </button>
                  <button onClick={() => { setShowJoin(false); setJoinCode(''); setJoinError(''); }}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', fontSize: 11,
                      background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer',
                    }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Room items */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {roomsLoading ? (
            <div style={{ padding: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--hairline)',
                }}>
                  <div style={{ width: '60%', height: 14, borderRadius: 4, background: 'var(--hover-overlay)', marginBottom: 8 }} />
                  <div style={{ width: '30%', height: 10, borderRadius: 3, background: 'var(--hover-overlay)' }} />
                </div>
              ))}
            </div>
          ) : roomsError ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 12 }}>
              <div style={{ marginBottom: 12 }}>Failed to load rooms</div>
              <button onClick={loadRooms}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                  background: 'var(--card)', color: 'var(--fg)', fontSize: 11, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 12 }}>
              No investigation rooms yet.<br />Create one to collaborate.
            </div>
          ) : (
            rooms.map(room => (
              <div key={room.id}
                onClick={() => selectRoom(room)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--hairline)',
                    background: activeRoom?.id === room.id ? 'var(--accent-soft)' : 'transparent',
                  borderLeft: activeRoom?.id === room.id ? '3px solid var(--accent)' : '3px solid transparent',
                }}
                onMouseEnter={e => { if (activeRoom?.id !== room.id) e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                onMouseLeave={e => { if (activeRoom?.id !== room.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Hash size={12} style={{ color: 'var(--fg-tertiary)' }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{room.name}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginTop: 3 }}>
                  {room.memberCount || room.members?.length || 0} members
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: isMobile && mobileView === 'list' ? 'none' : 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!activeRoom ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-tertiary)', fontSize: 13 }}>
            <div style={{ textAlign: 'center' }}>
              {roomSelecting ? (
                <>
                  <Loader2 size={28} style={{ marginBottom: 12, opacity: 0.5, animation: 'spin 1s linear infinite' }} />
                  <div>Loading room...</div>
                </>
              ) : (
                <>
                  <Users size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div>Select or create an investigation room</div>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Room header */}
            <div style={{
              padding: isMobile ? '9px 12px' : '12px 20px', borderBottom: '1px solid var(--hairline)',
              display: 'flex', alignItems: 'center', gap: 8,
              minHeight: isMobile ? 54 : undefined,
            }}>
              {isMobile && (
                <button
                  onClick={() => { setMobileView('list'); setActiveRoom(null); disconnectRoomSocket(); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--fg-secondary)',
                    cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <Hash size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{activeRoom.name}</span>
              <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                {activeRoom.memberCount || activeRoom.members?.length || 0} members
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={handleGetInviteLink}
                disabled={inviting}
                title="Generate invite code"
                style={{
                  background: 'none', border: 'none', color: 'var(--fg-tertiary)',
                  cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 'var(--radius-md)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Link size={16} />
              </button>
              <button
                onClick={() => setShowRoomSettings(!showRoomSettings)}
                title="Room settings"
                style={{
                  background: 'none', border: 'none', color: 'var(--fg-tertiary)',
                  cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 'var(--radius-md)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Settings size={16} />
              </button>
            </div>

            {/* Invite popover */}
            {showInvite && inviteCode && inviteLink && (
              <div style={{
                padding: '14px 20px', borderBottom: '1px solid var(--hairline)',
                background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>Invite to {activeRoom.name}</span>
                  <button onClick={() => setShowInvite(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-tertiary)', cursor: 'pointer', padding: 2 }}>
                    <X size={14} />
                  </button>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Invite Code
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <code style={{
                      flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-md)',
                      background: 'var(--card)', border: '1px solid var(--card-border)',
                      color: 'var(--accent)', fontSize: 13, fontWeight: 600,
                      fontFamily: 'monospace',
                    }}>{inviteCode}</code>
                    <button onClick={async () => {
                      await navigator.clipboard.writeText(inviteCode);
                      notify.success('Code copied!');
                    }}
                      style={{
                        padding: '6px 10px', borderRadius: 'var(--radius-md)', border: 'none',
                        background: 'var(--accent)', color: 'var(--accent-ink)', cursor: 'pointer',
                      }}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Or share link
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text" value={inviteLink}
                      readOnly
                      onClick={e => e.currentTarget.select()}
                      style={{
                        flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--card-border)', background: 'var(--card)',
                        color: 'var(--fg)', fontSize: 11, outline: 'none',
                      }}
                    />
                    <button onClick={async () => {
                      await navigator.clipboard.writeText(inviteLink);
                      notify.success('Link copied!');
                    }}
                      style={{
                        padding: '6px 10px', borderRadius: 'var(--radius-md)', border: 'none',
                        background: 'var(--accent)', color: 'var(--accent-ink)', cursor: 'pointer',
                      }}>
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Room settings panel */}
            {showRoomSettings && (
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--hairline)',
                background: 'var(--bg-secondary)', maxHeight: 400, overflow: 'auto',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Room Info
                  <button onClick={() => { setShowRoomSettings(false); setEditingDescription(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-tertiary)', cursor: 'pointer', padding: 2 }}>
                    <X size={14} />
                  </button>
                </div>

                {/* Room name */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Room Name
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500 }}>{activeRoom.name}</div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Description
                  </div>
                  {editingDescription ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text" value={editDescValue}
                        onChange={e => setEditDescValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateDescription(); if (e.key === 'Escape') setEditingDescription(false); }}
                        placeholder="Room description..."
                        autoFocus
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--card-border)', background: 'var(--card)',
                          color: 'var(--fg)', fontSize: 12, outline: 'none',
                        }}
                      />
                      <button onClick={handleUpdateDescription}
                        style={{
                          padding: '4px 12px', borderRadius: 'var(--radius-md)', border: 'none',
                          background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}>Save</button>
                      <button onClick={() => setEditingDescription(false)}
                        style={{
                          padding: '4px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)',
                          background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 11, cursor: 'pointer',
                        }}>Cancel</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => { setEditDescValue(activeRoom.description || ''); setEditingDescription(true); }}
                      style={{
                        fontSize: 12, color: activeRoom.description ? 'var(--fg-secondary)' : 'var(--fg-tertiary)',
                        cursor: 'pointer', padding: '6px 10px', borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--hairline)',
                        fontStyle: activeRoom.description ? 'normal' : 'italic',
                      }}>
                      {activeRoom.description || 'Click to add a description...'}
                    </div>
                  )}
                </div>

                {/* Members list */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Members ({activeRoom.memberCount || activeRoom.members?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {activeRoom.members?.map(m => {
                      const isSelf = m.uid === profile?.uid;
                      const memberRole = m.role || 'member';
                      const canManage = (isAdmin || isOwner) && !isSelf;
                      const isMemberOwner = m.uid === activeRoom.createdBy;
                      return (
                        <div key={m.uid} style={{
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                          padding: '5px 8px', borderRadius: 'var(--radius-md)',
                          background: isSelf ? 'var(--accent-soft)' : 'transparent',
                        }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: 'var(--hover-overlay)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: 10, fontWeight: 600, color: 'var(--accent)',
                          }}>
                            {(m.displayName || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ color: 'var(--fg)', flex: 1 }}>
                            {m.displayName || `${m.uid.slice(0, 6)}...${m.uid.slice(-4)}`}
                            {isSelf && <span style={{ fontSize: 9, color: 'var(--fg-tertiary)', marginLeft: 4 }}>(you)</span>}
                          </span>
                          <span style={{
                            fontSize: 9, padding: '1px 5px', borderRadius: 'var(--radius-full)',
                            background: isMemberOwner ? 'rgba(255,193,7,0.15)' : memberRole === 'admin' ? 'var(--accent-soft)' : 'var(--hover-overlay)',
                            color: isMemberOwner ? 'var(--warning)' : memberRole === 'admin' ? 'var(--accent)' : 'var(--fg-tertiary)',
                            fontWeight: 500,
                          }}>
                            {isMemberOwner ? 'Owner' : memberRole}
                          </span>
                          {canManage && (
                            <button onClick={() => handleRemoveMember(m.uid)}
                              title="Remove member"
                              style={{
                                background: 'none', border: 'none', color: 'var(--fg-tertiary)',
                                cursor: 'pointer', padding: 2, display: 'flex',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.color = 'var(--destructive)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Invite link */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                    Invite Link
                  </div>
                  {inviteLink ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text" value={inviteLink}
                        readOnly
                        onClick={e => e.currentTarget.select()}
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--card-border)', background: 'var(--card)',
                          color: 'var(--fg)', fontSize: 11, outline: 'none',
                        }}
                      />
                      <button onClick={async () => {
                        await navigator.clipboard.writeText(inviteLink);
                        notify.success('Link copied!');
                      }}
                        style={{
                          padding: '6px 10px', borderRadius: 'var(--radius-md)', border: 'none',
                          background: 'var(--accent)', color: 'var(--accent-ink)', cursor: 'pointer',
                        }}>
                        <Copy size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={handleGetInviteLink} disabled={inviting}
                      style={{
                        padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
                        background: 'var(--card)', color: 'var(--fg)', fontSize: 11, fontWeight: 500,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                      <Link size={12} />
                      {inviting ? 'Generating...' : 'Generate Invite Link'}
                    </button>
                  )}
                </div>

                {/* Danger zone */}
                <div style={{
                  borderTop: '1px solid var(--hairline)', paddingTop: 12,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--destructive)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Danger Zone
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!isOwner && (
                      <button onClick={handleLeaveRoom}
                        style={{
                          padding: '6px 14px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--destructive)',
                          background: 'transparent', color: 'var(--destructive)',
                          fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        }}>
                        Leave Room
                      </button>
                    )}
                    {isOwner && (
                      <button onClick={handleDeleteRoom} disabled={deleting}
                        style={{
                          padding: '6px 14px', borderRadius: 'var(--radius-md)',
                          border: 'none', background: 'var(--destructive)',
                          color: '#fff', fontSize: 11, fontWeight: 500,
                          cursor: deleting ? 'default' : 'pointer',
                          opacity: deleting ? 0.6 : 1,
                        }}>
                        {deleting ? 'Deleting...' : 'Delete Room'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={chatFeedRef} className="ft-room-feed"
              onTouchStart={isMobile ? handleChatFeedDoubleTap : undefined}
              style={{ flex: 1, overflow: 'auto', padding: isMobile ? '10px 10px' : '16px 20px' }}>
              {roomSelecting ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                      display: 'flex', gap: 8,
                      flexDirection: i % 2 === 0 ? 'row-reverse' : 'row',
                      padding: isMobile ? '2px 0' : '2px 48px',
                    }}>
                      {i % 2 !== 0 && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--hover-overlay)', flexShrink: 0 }} />
                      )}
                      <div style={{
                        padding: '8px 14px', borderRadius: i % 2 === 0 ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
	                        background: i % 2 === 0 ? 'var(--accent-soft)' : 'var(--card)',
                        border: '1px solid var(--hairline)',
                      }}>
                        <div style={{
                          width: `${72 + (i % 3) * 34}px`, height: 12,
                          borderRadius: 6, background: 'var(--hover-overlay)',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--fg-tertiary)', fontSize: 12, padding: 40 }}>
                  No messages yet. Start the investigation.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 9 : 8 }}>
                  {messages.map(msg => {
                    const senderUid = getSenderUid(msg.sender);
                    const senderName = getSenderName(msg.sender);
                    const isMe = senderUid === profile?.uid;
                    const isAi = senderUid === 'ai' || senderName === 'FundTracer AI';
                    const isSystem = msg.type === 'system' || (msg as any).contentType === 'system' || senderUid === 'system';

                    if (isSystem) {
                      return (
                        <div key={msg.id} style={{
                          textAlign: 'center', padding: '4px 0',
                          fontSize: 11, color: 'var(--fg-tertiary)',
                          fontStyle: 'italic', opacity: 0.75,
                        }}>
                          {msg.content}
                        </div>
                      );
                    }

                    return (
	                      <div key={msg.id} className="ft-room-message" style={{
                        display: 'flex', gap: 8,
                        flexDirection: isMe ? 'row-reverse' : 'row',
                        padding: isMobile ? '2px 0' : '2px 48px',
                      }}>
                        {!isMe && (
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
	                            background: isAi ? 'var(--accent-soft)' : 'var(--hover-overlay)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: 11, fontWeight: 600,
                            color: isAi ? 'var(--accent)' : 'var(--accent)',
                            alignSelf: 'flex-end', marginBottom: 2,
                          }}>
                            {isAi ? <Bot size={13} /> : senderName[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div style={{ maxWidth: isMobile ? '82%' : '65%' }}>
                          {!isMe && (
                            <div style={{
                              fontSize: 10, color: isAi ? 'var(--accent)' : 'var(--fg-tertiary)',
                              marginBottom: 2, marginLeft: 4,
                            }}>
                              {senderName}
                            </div>
                          )}
                          <div style={{
	                            padding: isMobile ? '10px 13px' : '9px 15px', fontSize: 13,
	                            borderRadius: isMe ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
	                            background: isMe ? 'var(--fg)' : isAi ? 'var(--accent-soft)' : 'var(--card)',
	                            border: isAi ? '1px solid var(--accent-border)' : '1px solid var(--hairline)',
	                            color: isMe ? 'var(--bg)' : 'var(--fg)',
	                            boxShadow: isMe ? '0 10px 26px color-mix(in srgb, var(--fg) 12%, transparent)' : undefined,
                            wordBreak: 'break-word',
                          }}>
                            <MarkdownContent text={msg.content} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    <div ref={messagesEndRef} />
	                </div>
	              )}
	            </div>

            {/* Typing indicator */}
            {(aiTyping || typingUsers.size > 0) && (
              <div style={{ padding: '4px 20px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                {aiTyping && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
	                      background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bot size={10} style={{ color: 'var(--accent)' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontStyle: 'italic' }}>
                      FT MAVERIICK is thinking
                      <span style={{ display: 'inline-block', width: 24, textAlign: 'left' }}>
	                        <span className="ft-typing-dot">.</span><span className="ft-typing-dot">.</span><span className="ft-typing-dot">.</span>
                      </span>
                    </span>
                  </div>
                )}
                {Array.from(typingUsers.entries()).map(([uid, data]) => (
                  <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontStyle: 'italic' }}>
                      {data.displayName} is typing
                      <span style={{ display: 'inline-block', width: 20, textAlign: 'left' }}>
	                        <span className="ft-typing-dot">.</span><span className="ft-typing-dot">.</span><span className="ft-typing-dot">.</span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: isMobile ? '8px 10px 10px' : '12px 20px', borderTop: '1px solid var(--hairline)', position: 'relative' }}>
              {/* Mention autocomplete dropdown */}
              {mentionMode === 'active' && filteredMentions.length > 0 && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 20, right: 20,
                  marginBottom: 4,
                  background: 'var(--card)', border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                  maxHeight: 240, overflow: 'auto', zIndex: 100,
                }}>
                  {filteredMentions.map((m, i) => (
                    <div key={m.uid}
                      onClick={() => insertMention(m)}
                      style={{
                        padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: i === mentionIndex ? 'var(--hover-overlay)' : 'transparent',
                        color: 'var(--fg)',
                        borderBottom: i < filteredMentions.length - 1 ? '1px solid var(--hairline)' : 'none',
                      }}
                      onMouseEnter={() => setMentionIndex(i)}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: 'var(--hover-overlay)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 600, color: 'var(--accent)', flexShrink: 0,
                      }}>
                        {m.displayName[0]?.toUpperCase() || '?'}
                      </div>
                      <span>{m.displayName}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Recording UI */}
              {isRecording && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '6px 0 4px' : '4px 0',
                  animation: 'ft-scale-in 150ms ease-out',
                }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%', background: 'var(--destructive)',
                    animation: 'ft-pulse 1.2s ease-in-out infinite', flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, color: 'var(--fg)', fontWeight: 500, flex: 1 }}>
                    Recording {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
                  </span>
                  <button onClick={cancelRecording} style={{
                    background: 'none', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-md)',
                    color: 'var(--fg-tertiary)', cursor: 'pointer', padding: '6px 12px', fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <X size={14} /> Cancel
                  </button>
                  <button onClick={stopRecording} style={{
                    background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-ink)', cursor: 'pointer', padding: '6px 12px', fontSize: 12,
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Check size={14} /> Send
                  </button>
                </div>
              )}

              {/* Image preview chips */}
              {attachedImages.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {attachedImages.map((img, i) => (
                    <div key={i} style={{
                      position: 'relative', borderRadius: 'var(--radius-md)',
                      overflow: 'hidden', border: '1px solid var(--card-border)',
                      animation: 'ft-scale-in 150ms ease-out',
                    }}>
                      <img src={img.dataUrl} alt={img.name}
                        style={{ width: 56, height: 56, objectFit: 'cover', display: 'block' }}
                      />
                      <button
                        onClick={() => removeImage(i)}
                        style={{
                          position: 'absolute', top: 2, right: 2, width: 16, height: 16,
                          borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none',
                          color: '#fff', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Audio preview */}
              {audioBlob && audioDataUrl && !isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, animation: 'ft-scale-in 150ms ease-out' }}>
                  <audio controls src={audioDataUrl}
                    style={{ flex: 1, height: 32, maxWidth: 300 }}
                  />
                  <button onClick={() => { setAudioBlob(null); setAudioDataUrl(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--fg-tertiary)', cursor: 'pointer', padding: 4 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: isMobile ? 7 : 8 }}>
                <input ref={inputRef} type="text" value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder={`Message ${activeRoom.name}... (use @ to mention)`}
                  disabled={loading || isRecording}
                  style={{
                    flex: 1, padding: isMobile ? '11px 12px' : '10px 14px', borderRadius: isMobile ? 10 : 'var(--radius-lg)',
                    border: '1px solid var(--card-border)', background: 'var(--card)',
                    color: 'var(--fg)', fontSize: isMobile ? 13 : 13, outline: 'none',
                    minWidth: 0,
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                    setTimeout(() => setMentionMode('off'), 150);
                  }}
                />
                {/* Plus menu (when input empty) */}
                {!input.trim() && !isRecording && attachedImages.length === 0 && !audioBlob ? (
                  <div ref={plusMenuRef} style={{ position: 'relative' }}>
                    <button type="button"
                      onClick={() => { setShowPlusMenu(!showPlusMenu); setShowHistoryPicker(false); }}
                      disabled={loading}
                      style={{
                        width: isMobile ? 46 : undefined,
                        height: isMobile ? 46 : undefined,
                        padding: isMobile ? 0 : '10px 16px', borderRadius: isMobile ? 10 : 'var(--radius-lg)', border: 'none',
                        background: 'var(--hover-overlay)', color: 'var(--fg-tertiary)',
                        cursor: loading ? 'default' : 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'background 150ms, color 150ms',
                      }}>
                      <Plus size={18} />
                    </button>
                    {showPlusMenu && (
                      <div style={{
                        position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
                        background: 'var(--card)', border: '1px solid var(--card-border)',
                        borderRadius: 'var(--radius-lg)', padding: 4, minWidth: 200,
                        boxShadow: 'var(--shadow-overlay)', zIndex: 200,
                        animation: 'ft-fade-up 150ms ease-out',
                      }}>
                        <button type="button"
                          onClick={() => { setShowPlusMenu(false); setTimeout(() => fileInputRef.current?.click(), 0); }}
                          style={plusMenuItemStyle}>
                          <ImageIcon size={14} />
                          <span>Image</span>
                        </button>
                        <button type="button"
                          onClick={() => { setShowHistoryPicker(!showHistoryPicker); setShowPlusMenu(false); }}
                          style={plusMenuItemStyle}>
                          <History size={14} />
                          <span>Scan History</span>
                        </button>
                        <button type="button"
                          onClick={startRecording}
                          style={plusMenuItemStyle}>
                          <Mic size={14} />
                          <span>Voice Note</span>
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                  </div>
                ) : isRecording ? null : (
                  <button type="button" onClick={handleSend}
                    disabled={loading || (!input.trim() && attachedImages.length === 0 && !audioBlob)}
                    style={{
                      width: isMobile ? 46 : undefined,
                      height: isMobile ? 46 : undefined,
                      padding: isMobile ? 0 : '10px 16px', borderRadius: isMobile ? 10 : 'var(--radius-lg)', border: 'none',
                      background: (input.trim() || attachedImages.length > 0 || audioBlob) ? 'var(--accent)' : 'var(--hover-overlay)',
                      color: (input.trim() || attachedImages.length > 0 || audioBlob) ? 'var(--accent-ink)' : 'var(--fg-tertiary)',
                      cursor: (input.trim() || attachedImages.length > 0 || audioBlob) ? 'pointer' : 'default',
                      transition: 'background 150ms, color 150ms',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                    <Send size={16} />
                  </button>
                )}
              </div>

              {/* Scan history picker */}
              {showHistoryPicker && (
                <div ref={historyPickerRef} style={{
                  position: 'absolute', bottom: '100%', right: 20, marginBottom: 4,
                  width: isMobile ? 'calc(100vw - 36px)' : 320, maxHeight: 340, overflow: 'auto',
                  background: 'var(--card)', border: '1px solid var(--card-border)',
                  borderRadius: 'var(--radius-lg)', padding: 4,
                  boxShadow: 'var(--shadow-overlay)', zIndex: 200,
                  animation: 'ft-fade-up 150ms ease-out',
                }}>
                  <div style={{
                    padding: '8px 12px', fontSize: 11, fontWeight: 600,
                    color: 'var(--fg-tertiary)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', borderBottom: '1px solid var(--hairline)',
                    marginBottom: 4,
                  }}>
                    Recent Scans
                  </div>
                  {scanHistory.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-tertiary)', textAlign: 'center' }}>
                      No scan history yet
                    </div>
                  ) : (
                    scanHistory.slice(0, 15).map((entry, i) => (
                      <button key={i}
                        type="button"
                        onClick={() => insertScanHistory(entry)}
                        style={{
                          width: '100%', textAlign: 'left', padding: '8px 12px',
                          border: 'none', background: 'transparent', cursor: 'pointer',
                          borderRadius: 'var(--radius-md)', color: 'var(--fg)',
                          display: 'flex', flexDirection: 'column', gap: 2,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                          {entry.address.slice(0, 10)}...{entry.address.slice(-6)}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>
                          {entry.chain}
                          {entry.riskLevel ? ` • Risk: ${entry.riskLevel}` : ''}
                          {entry.totalTransactions != null ? ` • ${entry.totalTransactions}${entry.transactionHistoryLimited ? '+' : ''} txs` : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
const plusMenuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
  border: 'none', background: 'transparent', color: 'var(--fg)',
  fontSize: 13, fontFamily: 'var(--font-sans)', cursor: 'pointer',
  textAlign: 'left' as const,
};
