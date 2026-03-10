import { useState, useEffect, useRef } from 'react';
import { FiCommand, FiX } from 'react-icons/fi';

export default function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [query, setQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    if (!isOpen) { setQuery(''); setSelectedIndex(0); return; }
    const q = query.toLowerCase();
    const filtered = commands.filter(cmd =>
      cmd.name.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q)
    );
    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query, isOpen, commands]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handleExecute = (command) => {
    if (command.action) command.action();
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, filteredCommands.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); if (filteredCommands[selectedIndex]) handleExecute(filteredCommands[selectedIndex]); }
  };

  if (!isOpen) return null;

  // Group by category
  const grouped = {};
  filteredCommands.forEach(cmd => {
    if (!grouped[cmd.category]) grouped[cmd.category] = [];
    grouped[cmd.category].push(cmd);
  });
  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[640px] mx-4 ide-sidebar-bg border ide-border-inp-c rounded-lg shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b ide-border-c">
          <FiCommand size={16} className="ide-text-muted shrink-0" />
          <input
            type="text"
            placeholder="Type a command or search…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent ide-text-bright text-sm outline-none placeholder-ide-muted"
          />
          {query && <button onClick={() => setQuery('')} className="ide-text-muted ide-h-text-bright"><FiX size={14} /></button>}
          <kbd className="text-[10px] ide-text-muted border ide-border-inp-c rounded px-1 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center ide-text-muted text-sm">
              No commands matching <em className="ide-text-bright">"{query}"</em>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, cmds]) => (
              <div key={cat}>
                <div className="px-4 py-1 text-[10px] uppercase tracking-widest ide-text-muted font-semibold ide-base-bg border-b ide-border-c">
                  {cat}
                </div>
                {cmds.map(cmd => {
                  const idx = globalIdx++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={cmd.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors
                        ${isSelected ? 'ide-selected-bg' : 'ide-text-bright ide-h-hover'}`}
                      onClick={() => handleExecute(cmd)}
                    >
                      <span className="text-base w-5 text-center shrink-0">{cmd.icon || '⚡'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{cmd.name}</div>
                        {cmd.description && (
                          <div className={`text-xs truncate ${isSelected ? 'opacity-80' : 'ide-text-muted'}`}>{cmd.description}</div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <kbd className={`text-[11px] border rounded px-1.5 py-0.5 shrink-0 font-mono
                          ${isSelected ? 'border-current opacity-80' : 'ide-border-inp-c ide-text-muted'}`}>
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-1.5 border-t ide-border-c text-[10px] ide-text-muted">
          <span><kbd className="border ide-border-inp-c rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border ide-border-inp-c rounded px-1">↵</kbd> select</span>
          <span><kbd className="border ide-border-inp-c rounded px-1">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
