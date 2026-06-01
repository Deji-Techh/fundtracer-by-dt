import { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Users, Plus, Hash, Bot, Settings, X, Copy, Link, RefreshCw, Loader2, ArrowLeft } from 'lucide-react';
import { getRooms, getRoom, getRoomMessages, sendRoomMessage, sendAiResponse, createRoom, inviteToRoom, updateRoom, deleteRoom, leaveRoom, removeRoomMember, lookupInvite, joinRoom, connectRoomSocket, disconnectRoomSocket, onRoomEvent, sendWsEvent, normalizeMessage, type InvestigationRoom, type RoomMessage } from '../../api/rooms';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { sendChatMessage } from '../../api/chat';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/ToastContext';
import { MarkdownContent } from '../analysis/MarkdownContent';

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
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinInfo, setJoinInfo] = useState<{ roomId: string; roomName: string } | null>(null);
  const [joinError, setJoinError] = useState('');

  const [typingUsers, setTypingUsers] = useState<Map<string, { displayName: string; timestamp: number }>>(new Map());
  const [aiTyping, setAiTyping] = useState(false);
  const typingSentRef = useRef(false);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  useEffect(() => { loadRooms(); }, []);

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
      if (data.roomId === activeRoom.id && (data.sender || data.senderId) && data.content) {
        const msg = normalizeMessage(data);
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

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !activeRoom || loading) return;
    setInput('');
    sendWsEvent({ type: 'typing_stop' });
    typingSentRef.current = false;
    setLoading(true);

    // Optimistic message — appears immediately
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: RoomMessage = {
      id: tempId,
      roomId: activeRoom.id,
      sender: { uid: profile?.uid || '', displayName: profile?.displayName || profile?.name || 'You' },
      content: text,
      timestamp: Date.now(),
      type: 'message',
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const msg = await sendRoomMessage(activeRoom.id, text);
      // Replace optimistic with real message, dedup by real ID
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== msg.id);
        return filtered.map(m => m.id === tempId ? msg : m);
      });

      // Check for @ai mention
      if (/@(ai|fundtracer|assistant|ft)\b/i.test(text)) {
        setAiTyping(true);
        try {
          const aiReply = await sendChatMessage(null, text, undefined, undefined);
          const aiMsg = await sendAiResponse(activeRoom.id, aiReply.reply);
          setMessages(prev => [...prev, aiMsg]);
        } catch { /* AI response failed silently */ }
        finally { setAiTyping(false); }
      }
    } catch {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      notify.error('Failed to send message');
    }
    finally { setLoading(false); }
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

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <style>{`
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes typing-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
.typing-dots { animation: typing-pulse 1.2s ease-in-out infinite; }
`}</style>
      {/* Room list */}
      <div style={{ width: isMobile ? '100%' : 280, borderRight: isMobile ? 'none' : '1px solid var(--hairline)', display: isMobile && mobileView === 'chat' ? 'none' : 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
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
                  background: 'var(--accent)', color: '#000', cursor: 'pointer',
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
                      background: 'var(--accent)', color: '#000', cursor: 'pointer',
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
                      color: joinCode.trim() ? '#000' : 'var(--fg-tertiary)',
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
                  background: activeRoom?.id === room.id ? 'rgba(0,230,122,0.1)' : 'transparent',
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
              padding: isMobile ? '10px 12px' : '12px 20px', borderBottom: '1px solid var(--hairline)',
              display: 'flex', alignItems: 'center', gap: 8,
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
                        background: 'var(--accent)', color: '#000', cursor: 'pointer',
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
                        background: 'var(--accent)', color: '#000', cursor: 'pointer',
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
                          background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer',
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
                          background: isSelf ? 'rgba(0,230,122,0.06)' : 'transparent',
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
                            background: isMemberOwner ? 'rgba(255,193,7,0.15)' : memberRole === 'admin' ? 'rgba(0,230,122,0.1)' : 'var(--hover-overlay)',
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
                          background: 'var(--accent)', color: '#000', cursor: 'pointer',
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
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
              {roomSelecting ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                      display: 'flex', gap: 8,
                      flexDirection: i % 2 === 0 ? 'row-reverse' : 'row',
                      padding: '2px 48px',
                    }}>
                      {i % 2 !== 0 && (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--hover-overlay)', flexShrink: 0 }} />
                      )}
                      <div style={{
                        padding: '8px 14px', borderRadius: i % 2 === 0 ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                        background: i % 2 === 0 ? 'rgba(0,168,132,0.15)' : 'var(--card)',
                        border: '1px solid var(--hairline)',
                      }}>
                        <div style={{
                          width: `${60 + Math.random() * 120}px`, height: 12,
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.map(msg => {
                    const senderUid = getSenderUid(msg.sender);
                    const senderName = getSenderName(msg.sender);
                    const isMe = senderUid === profile?.uid;
                    const isAi = senderUid === 'ai' || senderName === 'FundTracer AI';
                    return (
                      <div key={msg.id} style={{
                        display: 'flex', gap: 8,
                        flexDirection: isMe ? 'row-reverse' : 'row',
                        padding: '2px 48px',
                      }}>
                        {!isMe && (
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isAi ? 'rgba(0,230,122,0.12)' : 'var(--hover-overlay)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: 11, fontWeight: 600,
                            color: isAi ? 'var(--accent)' : 'var(--accent)',
                            alignSelf: 'flex-end', marginBottom: 2,
                          }}>
                            {isAi ? <Bot size={13} /> : senderName[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div style={{ maxWidth: '65%' }}>
                          {!isMe && (
                            <div style={{
                              fontSize: 10, color: isAi ? 'var(--accent)' : 'var(--fg-tertiary)',
                              marginBottom: 2, marginLeft: 4,
                            }}>
                              {senderName}
                            </div>
                          )}
                          <div style={{
                            padding: '8px 14px', fontSize: 13,
                            borderRadius: isMe ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                            background: isMe ? '#00a884' : isAi ? 'rgba(0,230,122,0.05)' : 'var(--card)',
                            border: isAi ? '1px solid rgba(0,230,122,0.3)' : '1px solid var(--hairline)',
                            color: isMe ? '#fff' : 'var(--fg)',
                            boxShadow: isMe ? '0 2px 12px rgba(0,168,132,0.25)' : undefined,
                            wordBreak: 'break-word',
                          }}>
                            {isAi || msg.type === 'ai-response' || msg.type === 'system'
                              ? <MarkdownContent text={msg.content} />
                              : msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                      background: 'rgba(0,230,122,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Bot size={10} style={{ color: 'var(--accent)' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontStyle: 'italic' }}>
                      FT MAVERIICK is thinking
                      <span style={{ display: 'inline-block', width: 24, textAlign: 'left' }}>
                        <span className="typing-dots">...</span>
                      </span>
                    </span>
                  </div>
                )}
                {Array.from(typingUsers.entries()).map(([uid, data]) => (
                  <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontStyle: 'italic' }}>
                      {data.displayName} is typing
                      <span style={{ display: 'inline-block', width: 20, textAlign: 'left' }}>
                        <span className="typing-dots">...</span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: isMobile ? '10px 12px 20px' : '12px 20px', borderTop: '1px solid var(--hairline)', position: 'relative' }}>
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
              <div style={{ display: 'flex', gap: 8 }}>
                <input ref={inputRef} type="text" value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                  placeholder={`Message ${activeRoom.name}... (use @ to mention)`}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--card-border)', background: 'var(--card)',
                    color: 'var(--fg)', fontSize: 13, outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--card-border)';
                    setTimeout(() => setMentionMode('off'), 150);
                  }}
                />
                <button onClick={handleSend} disabled={loading || !input.trim()}
                  style={{
                    padding: '10px 16px', borderRadius: 'var(--radius-lg)', border: 'none',
                    background: input.trim() ? 'var(--accent)' : 'var(--hover-overlay)',
                    color: input.trim() ? '#000' : 'var(--fg-tertiary)',
                    cursor: input.trim() ? 'pointer' : 'default',
                  }}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
