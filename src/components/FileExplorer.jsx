import { useState, useEffect, useRef } from 'react';
import { FiChevronRight, FiChevronDown, FiFile, FiFolder, FiFolderPlus, FiPlus, FiTrash2, FiEdit2, FiRefreshCw } from 'react-icons/fi';
import { VscNewFile, VscNewFolder, VscCollapseAll } from 'react-icons/vsc';
import toast from 'react-hot-toast';
import * as api from "../utils/api";

// ── File-type icon + color map ──────────────────────────────────────────────
const FILE_ICONS = {
  js:    { icon: 'JS',  color: '#f7df1e', bg: '#2a2a00' },
  jsx:   { icon: '⚛',   color: '#61dafb', bg: '#002832' },
  ts:    { icon: 'TS',  color: '#3178c6', bg: '#001a30' },
  tsx:   { icon: '⚛',   color: '#61dafb', bg: '#002832' },
  html:  { icon: '◈',   color: '#e44d26', bg: '#2a0a00' },
  css:   { icon: '🎨',  color: '#264de4', bg: '#000d2a' },
  scss:  { icon: '◈',   color: '#cc6699', bg: '#2a0015' },
  less:  { icon: '◈',   color: '#1d365d', bg: '#00060f' },
  json:  { icon: '{}',  color: '#fbc02d', bg: '#2a1e00' },
  md:    { icon: 'M↓',  color: '#519aba', bg: '#001a2a' },
  py:    { icon: '🐍',  color: '#3572a5', bg: '#001424' },
  java:  { icon: '☕',  color: '#b07219', bg: '#2a1700' },
  rs:    { icon: '⚙',   color: '#dea584', bg: '#2a1400' },
  go:    { icon: 'Go',  color: '#00add8', bg: '#002a35' },
  rb:    { icon: '💎',  color: '#cc342d', bg: '#2a0000' },
  php:   { icon: 'PHP', color: '#777bb4', bg: '#0d0d20' },
  cpp:   { icon: 'C++', color: '#659ad2', bg: '#001020' },
  c:     { icon: 'C',   color: '#555555', bg: '#111111' },
  cs:    { icon: 'C#',  color: '#178600', bg: '#001500' },
  sh:    { icon: '$_',  color: '#89e051', bg: '#0a1a00' },
  yaml:  { icon: '≡',   color: '#cb171e', bg: '#250000' },
  yml:   { icon: '≡',   color: '#cb171e', bg: '#250000' },
  sql:   { icon: '🗄',  color: '#e38c00', bg: '#2a1a00' },
  svg:   { icon: '⬡',   color: '#ff9a00', bg: '#2a1800' },
  vue:   { icon: 'V',   color: '#41b883', bg: '#001f14' },
  txt:   { icon: 'T',   color: '#888888', bg: '#1a1a1a' },
};
const getFileStyle = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || { icon: '📄', color: '#cccccc', bg: '#1e1e1e' };
};
const getFolderColor = () => '#e8bf60';

export default function FileExplorer({ onSelectFile, openFiles, currentFile, onOpenFile, onDeleteFile }) {
  const [files, setFiles] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [showNewItemDialog, setShowNewItemDialog] = useState(null); // 'file' | 'folder' | null
  const [newItemName, setNewItemName] = useState('');
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const newItemInputRef = useRef(null);

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

  const handleCreateItem = async () => {
    if (!newItemName.trim()) { toast.error('Enter a name'); return; }
    try {
      await api.createFile(newItemName, '', showNewItemDialog === 'folder' ? 'folder' : 'file');
      setNewItemName('');
      setShowNewItemDialog(null);
      loadFiles();
      toast.success(`${showNewItemDialog === 'folder' ? 'Folder' : 'File'} created`);
    } catch (error) {
      toast.error('Failed to create');
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

  const renderFileTree = (items, depth = 0) => {
    return items.map(item => (
      <div key={item.path}>
        {item.type === 'folder' ? (
          <div>
            <div
              className="flex items-center gap-1 px-2 py-[3px] cursor-pointer ide-h-hover ide-text-bright text-sm select-none group"
              style={{ paddingLeft: `${8 + depth * 12}px` }}
              onClick={() => toggleFolder(item.path)}
            >
              {expandedFolders.has(item.path)
                ? <FiChevronDown size={14} className="shrink-0 ide-text-muted" />
                : <FiChevronRight size={14} className="shrink-0 ide-text-muted" />}
              <FiFolder size={15} style={{ color: getFolderColor(), flexShrink: 0 }} />
              <span className="truncate">{item.name}</span>
            </div>
            {expandedFolders.has(item.path) && item.children && (
              <div>{renderFileTree(item.children, depth + 1)}</div>
            )}
          </div>
        ) : (
          <div
            className={`flex items-center gap-1.5 py-[3px] cursor-pointer text-sm select-none group relative
              ${currentFile === item.path ? 'ide-selected-bg' : 'ide-text-bright ide-h-hover'}`}
            style={{ paddingLeft: `${20 + depth * 12}px`, paddingRight: '6px' }}
            onClick={() => handleFileClick(item.path)}
            onContextMenu={(e) => { e.preventDefault(); setContextMenu({ path: item.path, x: e.clientX, y: e.clientY }); }}
          >
            {renamingPath === item.path ? (
              <input
                type="text"
                className="flex-1 ide-input-bg text-white text-xs px-1 py-0.5 border border-[#007acc] outline-none rounded"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameFile(item.path);
                  if (e.key === 'Escape') { setRenamingPath(null); setRenameValue(''); }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <>
                {/* Colored badge icon */}
                {(() => { const s = getFileStyle(item.name); return (
                  <span className="text-[10px] font-bold rounded px-0.5 shrink-0 leading-4"
                    style={{ color: s.color, backgroundColor: s.bg, minWidth: '18px', textAlign: 'center' }}>
                    {s.icon}
                  </span>
                ); })()}
                <span className="truncate flex-1">{item.name}</span>
                {openFiles && openFiles[item.path] && !openFiles[item.path]?.saved && (
                  <span className="w-1.5 h-1.5 rounded-full ide-text-bright shrink-0" title="Unsaved"
                    style={{ backgroundColor: 'var(--ide-text-bright)' }} />
                )}
              </>
            )}
            {!renamingPath && (
              <button
                className="opacity-0 group-hover:opacity-100 ml-auto shrink-0 p-0.5 rounded hover:bg-[#ff000044] ide-text-muted hover:text-[#f48771]"
                onClick={(e) => handleDeleteFile(item.path, e)} title="Delete">
                <FiTrash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full ide-sidebar-bg select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 ide-text-header text-[11px] uppercase tracking-widest font-semibold shrink-0">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowNewItemDialog('file'); setTimeout(() => newItemInputRef.current?.focus(), 50); }}
            className="p-1 rounded ide-h-btn ide-text-muted ide-h-text-bright" title="New File">
            <VscNewFile size={16} />
          </button>
          <button onClick={() => { setShowNewItemDialog('folder'); setTimeout(() => newItemInputRef.current?.focus(), 50); }}
            className="p-1 rounded ide-h-btn ide-text-muted ide-h-text-bright" title="New Folder">
            <VscNewFolder size={16} />
          </button>
          <button onClick={loadFiles}
            className="p-1 rounded ide-h-btn ide-text-muted ide-h-text-bright" title="Refresh">
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* New item input */}
      {showNewItemDialog && (
        <div className="px-2 py-1.5 border-b ide-border-c ide-base-bg">
          <input
            ref={newItemInputRef}
            type="text"
            placeholder={showNewItemDialog === 'folder' ? 'Folder name…' : 'File name (e.g., index.jsx)'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateItem();
              if (e.key === 'Escape') { setShowNewItemDialog(null); setNewItemName(''); }
            }}
            className="w-full ide-input-bg ide-text-bright text-xs px-2 py-1 border border-[#007acc] outline-none rounded"
            autoFocus
          />
          <div className="flex gap-1 mt-1">
            <button onClick={handleCreateItem}
              className="flex-1 text-[11px] py-0.5 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white">Create</button>
            <button onClick={() => { setShowNewItemDialog(null); setNewItemName(''); }}
              className="flex-1 text-[11px] py-0.5 rounded ide-btn-bg ide-h-btn-dk ide-text-bright">Cancel</button>
          </div>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="px-4 py-4 ide-text-muted text-xs animate-pulse">Loading…</div>
        ) : files.length === 0 ? (
          <div className="px-4 py-6 text-center ide-text-muted text-xs leading-relaxed">
            No files yet.<br />Click <strong className="ide-text-bright">+</strong> to create one.
          </div>
        ) : renderFileTree(files)}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 ide-sidebar-bg border ide-border-inp-c rounded shadow-xl py-1 min-w-37.5 text-sm ide-text-bright"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button className="flex items-center gap-2 w-full px-3 py-1.5 ide-h-selected text-left"
            onClick={() => { setRenamingPath(contextMenu.path); setRenameValue(contextMenu.path.split('/').pop()); setContextMenu(null); }}>
            <FiEdit2 size={13} /> Rename
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-1.5 ide-h-selected text-left"
            onClick={() => handleDuplicateFile(contextMenu.path)}>
            <FiFile size={13} /> Duplicate
          </button>
          <div className="border-t ide-border-c my-1" />
          <button className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#5a1d1d] text-[#f48771] text-left"
            onClick={(e) => { handleDeleteFile(contextMenu.path, e); setContextMenu(null); }}>
            <FiTrash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
