// ============================================================
// useRoomMessages — message loading + WebSocket merge + pagination
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRoomMessages, sendRoomMessage } from '../api';
import { on } from '../lib/investigationSocket';

interface RoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  content: string;
  contentType: 'text' | 'ai_card' | 'system' | 'pin_notice';
  aiCard?: any;
  mentions: string[];
  isPinned: boolean;
  createdAt: number;
  roomId: string;
}

export function useRoomMessages(roomId: string | null) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaded = useRef(false);

  // Load initial messages
  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      loaded.current = false;
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getRoomMessages(roomId, 50);
        setMessages(data.messages || []);
        setHasMore(data.hasMore ?? false);
      } catch {
        setMessages([]);
      } finally {
        setIsLoading(false);
        loaded.current = true;
      }
    };

    load();
  }, [roomId]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (!roomId) return;
    const unsub = on('message', (data: any) => {
      if (data.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });
    const unsubAiCard = on('ai_card', (data: any) => {
      if (data.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });
    return () => { unsub(); unsubAiCard(); };
  }, [roomId]);

  const loadMore = useCallback(async () => {
    if (!roomId || !hasMore || messages.length === 0) return;
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;

    try {
      const data = await getRoomMessages(roomId, 50, oldest);
      if (data.messages?.length) {
        setMessages(prev => [...data.messages, ...prev]);
      }
      setHasMore(data.hasMore ?? false);
    } catch {
      // fail silently
    }
  }, [roomId, hasMore, messages]);

  const send = useCallback(async (content: string) => {
    if (!roomId) return;
    // Optimistic insert — show message immediately
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: RoomMessage = {
      id: tempId,
      senderId: 'local',
      senderName: 'You',
      content,
      contentType: 'text',
      mentions: [],
      isPinned: false,
      createdAt: Date.now(),
      roomId,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const result = await sendRoomMessage(roomId, content);
      // Replace optimistic message with real one
      if (result.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? result.message : m));
      } else {
        // API succeeded but no message returned — remove optimistic
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
      return result.message;
    } catch {
      // API failed — remove optimistic
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw new Error('Failed to send message');
    }
  }, [roomId]);

  return { messages, isLoading, hasMore, loadMore, send };
}
