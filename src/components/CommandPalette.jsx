import { useState, useEffect } from 'react';
import { FiCommand, FiX } from 'react-icons/fi';
import './CommandPalette.css';

export default function CommandPalette({ isOpen, onClose, commands = [] }) {
  const [query, setQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      return;
    }

    const filtered = commands.filter(cmd =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.category.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query, isOpen, commands]);

  const handleExecute = (command) => {
    if (command.action) {
      command.action();
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleExecute(filteredCommands[selectedIndex]);
        }
        break;
      default:
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-header">
          <FiCommand size={18} />
          <input
            type="text"
            placeholder="Type a command name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="palette-input"
          />
          <button className="palette-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className="palette-content">
          {filteredCommands.length === 0 ? (
            <div className="palette-empty">
              No commands found for "{query}"
            </div>
          ) : (
            <div className="palette-list">
              {filteredCommands.map((cmd, idx) => (
                <div
                  key={cmd.id}
                  className={`palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleExecute(cmd)}
                >
                  <span className="item-icon">{cmd.icon || '⚡'}</span>
                  <div className="item-info">
                    <span className="item-name">{cmd.name}</span>
                    {cmd.description && (
                      <span className="item-description">{cmd.description}</span>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <span className="item-shortcut">{cmd.shortcut}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
