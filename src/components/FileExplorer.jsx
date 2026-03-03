import { useState, useEffect } from 'react';
import { FiChevronRight, FiFile, FiFolder, FiPlus, FiTrash2, FiEdit2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as api from "../utils/api";
import './FileExplorer.css';

export default function FileExplorer({ onSelectFile, openFiles, currentFile, onOpenFile, onDeleteFile }) {
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const fileList = await api.listFiles();
      setFiles(fileList);
    } catch (error) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const handleFileClick = (filePath) => {
    onSelectFile(filePath);
  };

  const handleDeleteFile = async (filePath, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete ${filePath}?`)) {
      try {
        await api.deleteFile(filePath);
        onDeleteFile(filePath);
        loadFiles();
        toast.success('File deleted successfully');
      } catch (error) {
        toast.error('Failed to delete file');
      }
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }
    try {
      await api.createFile(newFileName);
      setNewFileName('');
      setShowNewFileDialog(false);
      loadFiles();
      toast.success('File created successfully');
    } catch (error) {
      toast.error('Failed to create file');
    }
  };

  const handleRenameFile = async (oldPath) => {
    if (!renameValue.trim() || renameValue === oldPath.split('/').pop()) {
      setRenamingPath(null);
      setRenameValue('');
      return;
    }

    const dir = oldPath.split('/').slice(0, -1).join('/');
    const newPath = dir ? `${dir}/${renameValue}` : renameValue;

    try {
      await api.renameFile(oldPath, newPath);
      loadFiles();
      toast.success('File renamed successfully');
    } catch (error) {
      toast.error('Failed to rename file');
    } finally {
      setRenamingPath(null);
      setRenameValue('');
      setContextMenu(null);
    }
  };

  const handleDuplicateFile = async (filePath) => {
    try {
      const content = await api.readFile(filePath);
      const newPath = filePath.replace(/(\.[^.]*)?$/, '.copy$1');
      await api.createFile(newPath, content);
      loadFiles();
      toast.success('File duplicated successfully');
    } catch (error) {
      toast.error('Failed to duplicate file');
    }
    setContextMenu(null);
  };

  const renderFileTree = (items) => {
    return items.map(item => (
      <div key={item.path}>
        {item.type === 'folder' ? (
          <div>
            <div 
              className="file-explorer-item folder"
              onClick={() => toggleFolder(item.path)}
            >
              <FiChevronRight 
                size={16}
                style={{ 
                  transform: expandedFolders.has(item.path) ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
              <FiFolder size={16} />
              <span className="file-name">{item.name}</span>
            </div>
            {expandedFolders.has(item.path) && item.children && (
              <div className="file-explorer-nested">
                {renderFileTree(item.children)}
              </div>
            )}
          </div>
        ) : (
          <div 
            className={`file-explorer-item file ${currentFile === item.path ? 'active' : ''}`}
            onClick={() => handleFileClick(item.path)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ path: item.path, x: e.clientX, y: e.clientY });
            }}
          >
            {renamingPath === item.path ? (
              <input
                type="text"
                className="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFile(item.path);
                  if (e.key === 'Escape') {
                    setRenamingPath(null);
                    setRenameValue('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <>
                <span className="file-icon">{api.getFileIcon(item.name)}</span>
                <span className="file-name">{item.name}</span>
              </>
            )}
            {!renamingPath && (
              <>
                <button 
                  className="delete-btn"
                  onClick={(e) => handleDeleteFile(item.path, e)}
                  title="Delete file"
                >
                  <FiTrash2 size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>Explorer</h3>
        <button 
          className="new-file-btn"
          onClick={() => setShowNewFileDialog(true)}
          title="Create new file"
        >
          <FiPlus size={18} />
        </button>
      </div>

      {showNewFileDialog && (
        <div className="new-file-dialog">
          <input
            type="text"
            placeholder="Enter file name (e.g., index.js)"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile();
              if (e.key === 'Escape') {
                setShowNewFileDialog(false);
                setNewFileName('');
              }
            }}
            autoFocus
          />
          <div className="dialog-buttons">
            <button onClick={handleCreateFile} className="btn-confirm">Create</button>
            <button 
              onClick={() => {
                setShowNewFileDialog(false);
                setNewFileName('');
              }} 
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="file-explorer-content">
        {loading ? (
          <div className="loading">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="empty-state">No files yet. Create a new file to get started!</div>
        ) : (
          renderFileTree(files)
        )}
      </div>

      {contextMenu && (
        <div 
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button onClick={() => {
            setRenamingPath(contextMenu.path);
            setRenameValue(contextMenu.path.split('/').pop());
            setContextMenu(null);
          }}>
            <FiEdit2 size={16} /> Rename
          </button>
          <button onClick={() => {
            handleDuplicateFile(contextMenu.path);
          }}>
            <FiFile size={16} /> Duplicate
          </button>
          <div className="context-menu-divider"></div>
          <button onClick={(e) => {
            handleDeleteFile(contextMenu.path, e);
            setContextMenu(null);
          }} className="delete-menu-item">
            <FiTrash2 size={16} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
