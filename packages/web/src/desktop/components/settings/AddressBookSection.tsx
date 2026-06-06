import { useState, useEffect, useRef } from 'react';
import { getAddressBook, addAddress, removeAddress, saveAddressBook } from '../../stores/addressBook';
import { useNotify } from '../../contexts/ToastContext';
import { useTabs } from '../../contexts/TabsContext';
import { ChainSelector } from '../common/ChainSelector';
import { Copy, ExternalLink, Trash2, Edit3, Download, Upload, Search, X, Plus, BookOpen } from 'lucide-react';
import type { AddressBookEntry, ChainId } from '../../types';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea', base: '#0052ff', arbitrum: '#28a0f0', optimism: '#ff0420',
  polygon: '#8247e5', bsc: '#f0b90b', linea: '#61d18c', solana: '#9945ff',
};

function hashColor(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export function AddressBookSection() {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [chain, setChain] = useState<ChainId>('ethereum');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState<'label' | 'chain' | 'recent'>('recent');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const notify = useNotify();
  const { openTab } = useTabs();

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = () => setEntries(getAddressBook());

  const handleAdd = () => {
    const addr = address.trim();
    if (!addr) { notify.error('Enter an address'); return; }
    if (!label.trim()) { notify.error('Enter a label'); return; }
    addAddress({ address: addr, label: label.trim(), chain, tags, createdAt: Date.now() });
    setAddress(''); setLabel(''); setTags([]); setTagInput('');
    notify.success('Address saved');
    loadEntries();
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setTags(prev => [...new Set([...prev, tagInput.trim()])]);
      setTagInput('');
    }
  };

  const handleEditTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editTagInput.trim()) {
      setEditTags(prev => [...new Set([...prev, editTagInput.trim()])]);
      setEditTagInput('');
    }
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));
  const removeEditTag = (t: string) => setEditTags(prev => prev.filter(x => x !== t));

  const startEdit = (entry: AddressBookEntry) => {
    setEditingId(entry.address);
    setEditLabel(entry.label);
    setEditTags([...entry.tags]);
    setEditTagInput('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    const entry = entries.find(e => e.address === editingId);
    if (entry) {
      addAddress({ ...entry, label: editLabel.trim() || entry.label, tags: editTags });
      notify.success('Updated');
      loadEntries();
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleDelete = (addr: string) => {
    removeAddress(addr);
    setSelected(prev => { const n = new Set(prev); n.delete(addr); return n; });
    notify.info('Address removed');
    loadEntries();
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    const book = getAddressBook().filter(e => !selected.has(e.address));
    saveAddressBook(book);
    setSelected(new Set());
    notify.info(`Removed ${selected.size} address${selected.size > 1 ? 'es' : ''}`);
    loadEntries();
  };

  const toggleSelect = (addr: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(addr)) n.delete(addr); else n.add(addr);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(e => e.address)));
  };

  const copyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
    } catch {
      const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
      await writeText(addr);
    }
    notify.success('Copied');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ addresses: entries }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fundtracer-address-book.json'; a.click();
    URL.revokeObjectURL(url);
    notify.success(`Exported ${entries.length} address${entries.length !== 1 ? 'es' : ''}`);
  };

  const handleImport = () => fileRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        const list: AddressBookEntry[] = data.addresses || data;
        if (!Array.isArray(list)) throw new Error('Invalid format');
        const book = getAddressBook();
        let added = 0;
        for (const entry of list) {
          if (entry.address && entry.label) {
            const existing = book.findIndex(e => e.address.toLowerCase() === entry.address.toLowerCase());
            if (existing >= 0) book[existing] = { ...book[existing], ...entry };
            else { book.push(entry); added++; }
          }
        }
        saveAddressBook(book);
        notify.success(`Imported ${added} new, ${list.length - added} updated`);
        loadEntries();
      } catch {
        notify.error('Invalid address book JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filtered = filter
    ? entries.filter(e => e.label.toLowerCase().includes(filter.toLowerCase()) || e.address.toLowerCase().includes(filter.toLowerCase()))
    : entries;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'label') return a.label.localeCompare(b.label);
    if (sortBy === 'chain') return a.chain.localeCompare(b.chain);
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div style={{ maxWidth: 720 }}>
      <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={20} style={{ color: 'var(--fg-secondary)' }} />
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--fg)', margin: 0, fontFamily: 'var(--font-sans)' }}>
            Address Book
          </h2>
          <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-mono)', background: 'var(--hover-overlay)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
            {entries.length}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleImport} style={toolbarBtnStyle}>
            <Upload size={13} /> Import
          </button>
          <button onClick={handleExport} disabled={entries.length === 0} style={toolbarBtnStyle}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Add form */}
      <div style={{
        background: 'var(--card)', borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--hairline)', padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <input
            type="text" value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="0x... or Solana address"
            spellCheck={false}
            style={inputStyle}
          />
          <input
            type="text" value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label"
            style={{ ...inputStyle, maxWidth: 180 }}
          />
          <ChainSelector value={chain} onChange={setChain} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          {tags.map(t => (
            <span key={t} style={{
              padding: '2px 8px', borderRadius: 'var(--radius-full)', background: `${hashColor(t)}20`,
              color: hashColor(t), fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {t}
              <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1, opacity: 0.6 }}>×</button>
            </span>
          ))}
          <input
            type="text" value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="+ tag"
            style={{ ...inputStyle, maxWidth: 100, padding: '3px 8px', fontSize: 11 }}
          />
        </div>
        <button onClick={handleAdd}
          style={{
            padding: '7px 20px', borderRadius: 'var(--radius-md)', border: 'none',
            background: address && label ? 'var(--accent)' : 'var(--hover-overlay)',
            color: address && label  ? 'var(--accent-ink)' : 'var(--fg-tertiary)',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
            cursor: address && label ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* Filter + Sort + Bulk actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-tertiary)' }} />
          <input
            type="text" value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by label or address..."
            style={{ ...inputStyle, paddingLeft: 30, width: '100%', marginBottom: 0 }}
          />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: '8px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)',
            background: 'var(--bg)', color: 'var(--fg)', fontSize: 11, fontFamily: 'var(--font-sans)',
            cursor: 'pointer', outline: 'none',
          }}>
          <option value="recent">Recent</option>
          <option value="label">Name</option>
          <option value="chain">Chain</option>
        </select>
        {selected.size > 0 && (
          <button onClick={handleBulkDelete}
            style={{
              padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--destructive)',
              background: 'rgba(255,69,58,0.08)', color: 'var(--destructive)', fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4,
            }}>
            <Trash2 size={12} /> {selected.size}
          </button>
        )}
        {filtered.length > 0 && (
          <button onClick={selectAll}
            style={{
              padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)',
              background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 10, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}>
            {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div style={{
          padding: 48, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <BookOpen size={32} style={{ color: 'var(--fg-tertiary)', opacity: 0.3 }} />
          <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', fontFamily: 'var(--font-sans)' }}>
            {entries.length === 0 ? 'No saved addresses yet. Add one above to get started.' : 'No matches found.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((entry) => {
            const isEditing = editingId === entry.address;
            const isSelected = selected.has(entry.address);
            const chainColor = CHAIN_COLORS[entry.chain] || '#888';

            return (
              <div key={entry.address} style={{
                padding: '12px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--card)',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
                opacity: isEditing ? 1 : undefined, transition: 'border-color 150ms',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                  {/* Checkbox */}
                  <button onClick={() => toggleSelect(entry.address)}
                    style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                      border: isSelected ? '2px solid var(--accent)' : '2px solid var(--card-border)',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      cursor: 'pointer', padding: 0,
                    }}>
                    {isSelected && <span style={{ color: 'var(--accent-ink)', fontSize: 10, lineHeight: 1 }}>✓</span>}
                  </button>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input type="text" value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          style={{ ...inputStyle, maxWidth: 280, marginBottom: 0, padding: '5px 10px', fontSize: 13 }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          {editTags.map(t => (
                            <span key={t} style={{
                              padding: '2px 8px', borderRadius: 'var(--radius-full)', background: `${hashColor(t)}20`,
                              color: hashColor(t), fontSize: 10, fontFamily: 'var(--font-sans)', fontWeight: 500,
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              {t}
                              <button onClick={() => removeEditTag(t)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1, opacity: 0.6 }}>×</button>
                            </span>
                          ))}
                          <input type="text" value={editTagInput}
                            onChange={e => setEditTagInput(e.target.value)}
                            onKeyDown={handleEditTag}
                            placeholder="+ tag"
                            style={{ ...inputStyle, maxWidth: 90, padding: '2px 8px', fontSize: 10, marginBottom: 0 }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={saveEdit} style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Save</button>
                          <button onClick={cancelEdit} style={{ padding: '4px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'transparent', color: 'var(--fg-tertiary)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                          {entry.label}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-secondary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {entry.address.slice(0, 10)}...{entry.address.slice(-6)}
                          </span>
                          <button onClick={() => copyAddress(entry.address)}
                            style={{ background: 'none', border: 'none', color: 'var(--fg-tertiary)', cursor: 'pointer', padding: 1, display: 'flex' }}
                            title="Copy address">
                            <Copy size={11} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={{
                            padding: '1px 7px', borderRadius: 'var(--radius-full)', fontSize: 9, fontWeight: 600,
                            fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.04em',
                            background: `${chainColor}20`, color: chainColor,
                          }}>
                            {entry.chain}
                          </span>
                          {entry.tags.map(t => (
                            <span key={t} style={{
                              padding: '1px 7px', borderRadius: 'var(--radius-full)', fontSize: 9, fontWeight: 500,
                              fontFamily: 'var(--font-sans)', background: `${hashColor(t)}18`, color: hashColor(t),
                            }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!isEditing && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => openTab(entry.address, entry.chain as ChainId, 'wallet')}
                      style={actionBtnStyle} title="Analyze"
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.background = 'transparent'; }}>
                      <ExternalLink size={13} />
                    </button>
                    <button onClick={() => startEdit(entry)}
                      style={actionBtnStyle} title="Edit"
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.background = 'var(--hover-overlay)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.background = 'transparent'; }}>
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(entry.address)}
                      style={actionBtnStyle} title="Remove"
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.background = 'rgba(255,69,58,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-tertiary)'; e.currentTarget.style.background = 'transparent'; }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, minWidth: 160, padding: '8px 12px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--card-border)', background: 'var(--bg)',
  color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-mono)', outline: 'none',
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)',
  background: 'var(--card)', color: 'var(--fg-secondary)', fontSize: 11, cursor: 'pointer',
  fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 5,
};

const actionBtnStyle: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 'var(--radius-md)', border: 'none',
  background: 'transparent', color: 'var(--fg-tertiary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
