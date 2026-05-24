// ============================================================
// useInvestigationSocket — WebSocket connection lifecycle
// ============================================================

import { useEffect, useCallback, useState } from 'react';
import { connect, disconnect, on, sendTypingStart, sendTypingStop, isConnected } from '../lib/investigationSocket';

type MessageHandler = (msg: any) => void;

export function useInvestigationSocket(roomId: string | null) {
  const [connected, setConnected] = useState(false);
  const [onlineUids, setOnlineUids] = useState<string[]>([]);

  useEffect(() => {
    if (!roomId) {
      disconnect();
      setConnected(false);
      setOnlineUids([]);
      return;
    }

    connect(roomId);

    const unsubs = [
      on('connected', () => setConnected(true)),
      on('disconnected', () => setConnected(false)),
      on('presence', (data: any) => setOnlineUids(data.online || [])),
      on('user_joined', (data: any) => setOnlineUids(prev => [...new Set([...prev, data.uid])])),
      on('user_left', (data: any) => setOnlineUids(prev => prev.filter(u => u !== data.uid))),
    ];

    return () => {
      unsubs.forEach(fn => fn());
      disconnect();
    };
  }, [roomId]);

  const startTyping = useCallback(() => { if (roomId) sendTypingStart(); }, [roomId]);
  const stopTyping = useCallback(() => { if (roomId) sendTypingStop(); }, [roomId]);

  return { connected, onlineUids, startTyping, stopTyping };
}
