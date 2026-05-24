import React from 'react';

interface RoomLayoutProps {
  chat: React.ReactNode;
  sidebar: React.ReactNode;
}

export function RoomLayout({ chat, sidebar }: RoomLayoutProps) {
  return (
    <div className="ir-layout">
      <div className="ir-chat">{chat}</div>
      <div className="ir-sidebar">{sidebar}</div>
    </div>
  );
}
