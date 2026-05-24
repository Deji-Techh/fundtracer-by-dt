import React, { useState } from 'react';

interface MessageSearchProps {
  onSearch: (query: string) => void;
}

export function MessageSearch({ onSearch }: MessageSearchProps) {
  const [query, setQuery] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className="ir-message-search">
      <input 
        type="text" 
        placeholder="Search messages..." 
        value={query}
        onChange={handleChange}
        className="ir-search-input"
      />
    </div>
  );
}
