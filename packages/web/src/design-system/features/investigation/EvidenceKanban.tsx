import React, { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';
import { pinMessage } from '../../../api';

interface KanbanItem {
  id: string;
  content: string;
  senderName: string;
  createdAt: number;
}

interface EvidenceKanbanProps {
  pinnedMessages: any[];
  onUnpin: (id: string) => void;
  roomId: string | null;
}

const COLUMNS = ['Suspect', 'Evidence', 'Cleared', 'Archived'] as const;

export function EvidenceKanban({ pinnedMessages, onUnpin, roomId }: EvidenceKanbanProps) {
  const [kanban, setKanban] = useState<Record<string, KanbanItem[]>>({
    Suspect: [],
    Evidence: [],
    Cleared: [],
    Archived: [],
  });

  // Load initial pins into columns based on their category
  useEffect(() => {
    const newKanban: Record<string, KanbanItem[]> = {
      Suspect: [], Evidence: [], Cleared: [], Archived: []
    };
    
    pinnedMessages.forEach(m => {
      const col = m.category || 'Evidence';
      if (newKanban[col]) {
        newKanban[col].push({
          id: m.id,
          content: m.content,
          senderName: m.senderName,
          createdAt: m.createdAt,
        });
      } else {
        newKanban.Evidence.push({
          id: m.id, content: m.content, senderName: m.senderName, createdAt: m.createdAt
        });
      }
    });
    
    setKanban(newKanban);
  }, [pinnedMessages]);

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const onDrop = async (e: React.DragEvent, column: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!roomId) return;
    
    const newKanban = { ...kanban };
    
    // Remove from all columns
    Object.keys(newKanban).forEach(col => {
      newKanban[col] = newKanban[col].filter(item => item.id !== id);
    });
    
    // Find the item
    let movedItem: KanbanItem | null = null;
    pinnedMessages.forEach(m => {
      if (m.id === id) {
        movedItem = {
          id: m.id,
          content: m.content,
          senderName: m.senderName,
          createdAt: m.createdAt,
        };
      }
    });
    
    if (movedItem) {
      newKanban[column].push(movedItem);
      
      // Persist to backend
      try {
        await pinMessage(roomId, id, column);
      } catch (err) {
        console.error('Failed to update pin category', err);
      }
    }
    
    setKanban(newKanban);
    setDraggedId(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="ir-kanban">
      {COLUMNS.map(column => (
        <div 
          key={column} 
          className="ir-kanban-column"
          onDrop={(e) => onDrop(e, column)}
          onDragOver={onDragOver}
        >
          <div className="ir-kanban-header">
            <Pin size={14} />
            <span>{column}</span>
            <span className="ir-kanban-count">{kanban[column].length}</span>
          </div>
          
          <div className="ir-kanban-items">
            {kanban[column].map(item => (
              <div 
                key={item.id}
                className="ir-kanban-card"
                draggable
                onDragStart={(e) => onDragStart(e, item.id)}
              >
                <div className="ir-kanban-card-header">
                  <span>{item.senderName || 'Unknown'}</span>
                  <button onClick={() => onUnpin(item.id)}>×</button>
                </div>
                <div className="ir-kanban-card-content">
                  {(item.content || '').slice(0, 120)}
                  {(item.content || '').length > 120 && '...'}
                </div>
              </div>
            ))}
            
            {kanban[column].length === 0 && (
              <div className="ir-kanban-empty">Drop here</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
