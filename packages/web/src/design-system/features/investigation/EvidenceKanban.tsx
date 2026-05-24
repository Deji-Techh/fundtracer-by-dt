import React, { useState } from 'react';
import { Pin } from 'lucide-react';

interface KanbanItem {
  id: string;
  content: string;
  senderName: string;
  createdAt: number;
}

interface EvidenceKanbanProps {
  pinnedMessages: any[];
  onUnpin: (id: string) => void;
}

const COLUMNS = ['Suspect', 'Evidence', 'Cleared', 'Archived'] as const;

export function EvidenceKanban({ pinnedMessages, onUnpin }: EvidenceKanbanProps) {
  const [kanban, setKanban] = useState<Record<string, KanbanItem[]>>({
    Suspect: [],
    Evidence: pinnedMessages.map(m => ({
      id: m.id,
      content: m.content,
      senderName: m.senderName,
      createdAt: m.createdAt,
    })),
    Cleared: [],
    Archived: [],
  });

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const onDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    
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
                  <span>{item.senderName}</span>
                  <button onClick={() => onUnpin(item.id)}>×</button>
                </div>
                <div className="ir-kanban-card-content">
                  {item.content.slice(0, 120)}
                  {item.content.length > 120 && '...'}
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
