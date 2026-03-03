import { useState, useEffect } from 'react';
import { FiSearch, FiX, FiChevronRight } from 'react-icons/fi';
import './SearchPanel.css';

export default function SearchPanel({ isOpen, onClose, files = [], onSelectFile }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = searchFiles(files, query);
    setSearchResults(results);
    setSelectedIndex(0);
  }, [query, files]);

  const searchFiles = (items, searchQuery) => {
    const results = [];
    const query = searchQuery.toLowerCase();

    const traverse = (fileItems) => {
      fileItems.forEach(item => {
        if (item.type === 'folder' && item.children) {
          traverse(item.children);
        } else if (item.type === 'file' && item.name.toLowerCase().includes(query)) {
          results.push({
            name: item.name,
            path: item.path,
            folder: item.path.split('/').slice(0, -1).join('/') || 'root'
          });
        }
      });
    };

    traverse(items);
    return results;
  };

  const handleSelectResult = (result) => {
    onSelectFile(result.path);
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
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleSelectResult(searchResults[selectedIndex]);
        }
        break;
      default:
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="search-panel-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <FiSearch size={18} />
          <input
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="search-input"
          />
          <button className="search-close" onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className="search-content">
          {query && searchResults.length === 0 ? (
            <div className="search-empty">
              No files found matching "{query}"
            </div>
          ) : !query ? (
            <div className="search-placeholder">
              Type to search files...
            </div>
          ) : (
            <div className="search-results">
              <div className="results-count">{searchResults.length} file{searchResults.length !== 1 ? 's' : ''} found</div>
              <div className="results-list">
                {searchResults.map((result, idx) => (
                  <div
                    key={result.path}
                    className={`search-result-item ${idx === selectedIndex ? 'selected' : ''}`}
                    onClick={() => handleSelectResult(result)}
                  >
                    <FiChevronRight size={14} />
                    <span className="result-name">{result.name}</span>
                    <span className="result-path">{result.folder}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
