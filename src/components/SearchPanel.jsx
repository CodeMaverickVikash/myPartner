import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiFile } from 'react-icons/fi';

export default function SearchPanel({ isOpen, onClose, files = [], onSelectFile }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const q = query.toLowerCase();
    const results = [];
    const traverse = (items) => {
      items.forEach(item => {
        if (item.type === 'folder' && item.children) traverse(item.children);
        else if (item.type === 'file' && item.name.toLowerCase().includes(q))
          results.push({ name: item.name, path: item.path, folder: item.path.split('/').slice(0,-1).join('/') || '/' });
      });
    };
    traverse(files);
    setSearchResults(results);
    setSelectedIndex(0);
  }, [query, files]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleSelect = (result) => { onSelectFile(result.path); onClose(); };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p+1, searchResults.length-1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => Math.max(p-1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); if (searchResults[selectedIndex]) handleSelect(searchResults[selectedIndex]); }
  };

  if (!isOpen) return null;

  // Highlight matched part in name
  const highlight = (text, q) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return <><span>{text.slice(0, idx)}</span><mark className="bg-[#f9f23a33] text-[#f9f23a] rounded-sm">{text.slice(idx, idx+q.length)}</mark><span>{text.slice(idx+q.length)}</span></>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[560px] mx-4 ide-sidebar-bg border ide-border-inp-c rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b ide-border-c">
          <FiSearch size={16} className="ide-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Go to file… (type to filter)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent ide-text-bright text-sm outline-none"
          />
          {query
            ? <button onClick={() => setQuery('')} className="ide-text-muted ide-h-text-white"><FiX size={14}/></button>
            : <kbd className="text-[10px] ide-text-muted border ide-border-inp-c rounded px-1">Ctrl+P</kbd>}
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto" ref={listRef}>
          {!query && (
            <div className="px-4 py-6 text-center ide-text-muted text-sm">Start typing to search files…</div>
          )}
          {query && searchResults.length === 0 && (
            <div className="px-4 py-6 text-center ide-text-muted text-sm">No files matching <em className="ide-text-bright">"{query}"</em></div>
          )}
          {searchResults.map((r, idx) => (
            <div
              key={r.path}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors
                ${idx === selectedIndex ? 'ide-selected-bg' : 'ide-text-bright ide-h-hover'}`}
              onClick={() => handleSelect(r)}
            >
              <FiFile size={14} className="shrink-0 ide-text-muted" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{highlight(r.name, query)}</div>
                <div className={`text-xs truncate ${idx === selectedIndex ? 'opacity-80' : 'ide-text-muted'}`}>{r.folder}</div>
              </div>
            </div>
          ))}
        </div>

        {searchResults.length > 0 && (
          <div className="px-4 py-1.5 border-t ide-border-c text-[10px] ide-text-muted">
            {searchResults.length} file{searchResults.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>
    </div>
  );
}
