// ============================================================
// useRoomPins — pin state management
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { getRoomPins, pinMessage as apiPin, unpinMessage as apiUnpin } from '../api';

export function useRoomPins(roomId: string | null) {
  const [pins, setPins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setPins([]);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await getRoomPins(roomId);
        setPins(data.pins || []);
      } catch {
        setPins([]);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [roomId]);

  const pinMessage = useCallback(async (messageId: string, category?: string) => {
    if (!roomId) return;
    await apiPin(roomId, messageId, category || 'evidence');
    // Reload pins
    const data = await getRoomPins(roomId);
    setPins(data.pins || []);
  }, [roomId]);

  const unpinMessage = useCallback(async (messageId: string) => {
    if (!roomId) return;
    await apiUnpin(roomId, messageId);
    const data = await getRoomPins(roomId);
    setPins(data.pins || []);
  }, [roomId]);

  return { pins, isLoading, pinMessage, unpinMessage };
}
