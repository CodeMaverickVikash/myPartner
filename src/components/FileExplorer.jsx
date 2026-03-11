import { useState, useEffect, useRef } from 'react';
import { FiChevronRight, FiChevronDown, FiFile, FiFolder, FiFolderPlus, FiPlus, FiTrash2, FiEdit2, FiRefreshCw, FiX } from 'react-icons/fi';
import { VscNewFile, VscNewFolder, VscCollapseAll } from 'react-icons/vsc';
import toast from 'react-hot-toast';
import * as api from "../utils/api";
import { projectManager } from "../utils/projectManager";

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
  const [contextMenu, setContextMenu] = useState(null); // { type: 'file'|'folder'|'project', path/id, x, y, name }
  const [showNewItemDialog, setShowNewItemDialog] = useState(null); // { type: 'file'|'folder', location: path/projectId }
  const [newItemName, setNewItemName] = useState('');
  const [renamingPath, setRenamingPath] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const newItemInputRef = useRef(null);
  
  // ─── Project files state ───────────────────────────────────────────────────
  const [projectsList, setProjectsList] = useState([]);
  const [projectFiles, setProjectFiles] = useState({});
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  useEffect(() => {
    loadFiles();
  }, []);

  // ─── Load and listen to project changes ────────────────────────────────────
  useEffect(() => {
    // Initial load
    refreshProjectsList();

    // Listen to project manager events
    const unsubscribeFileAdded = projectManager.on('fileAdded', (fileData) => {
      refreshProjectsList();
    });

    const unsubscribeFileRemoved = projectManager.on('fileRemoved', (fileData) => {
      refreshProjectsList();
    });

    const unsubscribeFileChanged = projectManager.on('fileChanged', (fileData) => {
      setProjectFiles(prev => ({
        ...prev,
        [fileData.id]: fileData
      }));
    });

    const unsubscribeFileSaved = projectManager.on('fileSaved', (fileData) => {
      setProjectFiles(prev => ({
        ...prev,
        [fileData.id]: fileData
      }));
    });

    const unsubscribeProjectOpened = projectManager.on('projectOpened', (project) => {
      refreshProjectsList();
      // Auto-expand newly opened project
      setExpandedProjects(prev => new Set([...prev, project.id]));
    });

    const unsubscribeProjectClosed = projectManager.on('projectClosed', (project) => {
      refreshProjectsList();
      setExpandedProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(project.id);
        return newSet;
      });
    });

    return () => {
      if (unsubscribeFileAdded) unsubscribeFileAdded();
      if (unsubscribeFileRemoved) unsubscribeFileRemoved();
      if (unsubscribeFileChanged) unsubscribeFileChanged();
      if (unsubscribeFileSaved) unsubscribeFileSaved();
      if (unsubscribeProjectOpened) unsubscribeProjectOpened();
      if (unsubscribeProjectClosed) unsubscribeProjectClosed();
    };
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

  // ─── Project file management ──────────────────────────────────────────────
  const refreshProjectsList = () => {
    const projects = projectManager.getAllProjects();
    setProjectsList(projects);
    
    // Update project files map
    const filesMap = {};
    projects.forEach(project => {
      const projFiles = projectManager.getProjectFiles(project.id);
      projFiles.forEach(file => {
        filesMap[file.id] = file;
      });
    });
    setProjectFiles(filesMap);
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleProjectFileClick = (fileId, fileName) => {
    // Dispatch custom event to open file in editor
    window.dispatchEvent(new CustomEvent('openProjectFile', {
      detail: {
        fileId,
        fileData: projectFiles[fileId],
        fileName
      }
    }));
  };

  const handleRemoveProjectFile = (fileId, e) => {
    e.stopPropagation();
    projectManager.removeFile(fileId);
    toast.success('File removed from project');
  };

  const handleCloseProject = (projectId, e) => {
    e.stopPropagation();
    const project = projectManager.getProject(projectId);
    const projFiles = projectManager.getProjectFiles(projectId);
    const unsavedCount = projFiles.filter(f => !f.saved).length;

    let confirmMessage = `Close project "${project?.name}"?`;
    if (unsavedCount > 0) {
      confirmMessage += `\n\n⚠️ ${unsavedCount} file(s) have unsaved changes.`;
    }

    if (window.confirm(confirmMessage)) {
      projectManager.closeProject(projectId);
      toast.success('Project closed');
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
    if (!newItemName.trim()) { 
      toast.error('Please enter a name'); 
      return; 
    }
    
    if (!showNewItemDialog) {
      toast.error('No dialog context');
      return;
    }
    
    try {
      const isFolder = showNewItemDialog.type === 'folder';
      let location = showNewItemDialog.location;
      
      // Normalize path separators to forward slashes (Windows compatibility)
      if (location) {
        location = location.replace(/\\/g, '/');
      }
      
      console.log('Creating item:', { type: showNewItemDialog.type, location, name: newItemName });
      
      // Handle project file creation
      if (location && location.startsWith('project:')) {
        const projectId = location.replace('project:', '');
        const project = projectManager.getProject(projectId);
        if (project) {
          toast.info('Files can be added to project by opening from that folder', { duration: 3000 });
        } else {
          toast.error('Project not found');
        }
        setNewItemName('');
        setShowNewItemDialog(null);
        return;
      }
      
      // Handle regular file/folder creation
      const itemPath = location ? `${location}/${newItemName}` : newItemName;
      console.log('Creating file/folder:', itemPath);
      
      const result = await api.createFile(itemPath, '', isFolder ? 'folder' : 'file');
      console.log('Creation result:', result);
      
      setNewItemName('');
      setShowNewItemDialog(null);
      
      // Refresh lists
      await loadFiles();
      await refreshProjectsList();
      
      toast.success(`${isFolder ? 'Folder' : 'File'} created successfully`);
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error(`Failed to create: ${error.message || 'Unknown error'}`);
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
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  type: 'folder',
                  path: item.path,
                  name: item.name,
                  x: e.clientX,
                  y: e.clientY
                });
              }}
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

  // ─── Render projects section ──────────────────────────────────────────────
  const renderProjectsSection = () => {
    if (projectsList.length === 0) return null;

    return (
      <div className="border-t ide-border-c">
        {/* Projects header */}
        <div className="flex items-center justify-between px-3 py-1.5 ide-text-header text-[11px] uppercase tracking-widest font-semibold shrink-0 ide-sidebar-bg sticky top-0 z-10">
          <span>Projects</span>
          <span className="text-[9px] ide-text-muted">{projectsList.length}</span>
        </div>

        {/* Projects list */}
        <div>
          {projectsList.map(project => {
            const projFiles = projectManager.getProjectFiles(project.id);
            const isExpanded = expandedProjects.has(project.id);

            return (
              <div key={project.id}>
                {/* Project header */}
                <div
                  className="flex items-center gap-1 px-2 py-[3px] cursor-pointer ide-h-hover ide-text-bright text-sm select-none group"
                  onClick={() => toggleProject(project.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      type: 'project',
                      id: project.id,
                      name: project.name,
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                >
                  {isExpanded
                    ? <FiChevronDown size={14} className="shrink-0 ide-text-muted" />
                    : <FiChevronRight size={14} className="shrink-0 ide-text-muted" />}
                  <FiFolder size={15} style={{ color: '#e8bf60', flexShrink: 0 }} />
                  <span className="truncate flex-1">{project.name}</span>
                  <span className="text-[10px] ide-text-muted">({projFiles.length})</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 shrink-0 ml-1 p-0.5 rounded hover:bg-[#ff000044] ide-text-muted hover:text-[#f48771]"
                    onClick={(e) => handleCloseProject(project.id, e)}
                    title="Close project"
                  >
                    <FiX size={12} />
                  </button>
                </div>

                {/* Project files */}
                {isExpanded && (
                  <div>
                    {projFiles.length === 0 ? (
                      <div className="text-[11px] ide-text-muted px-6 py-1">No files</div>
                    ) : (
                      projFiles.map(file => (
                        <div
                          key={file.id}
                          className={`flex items-center gap-1.5 py-[3px] cursor-pointer text-sm select-none group relative
                            ${currentFile === `project:${file.id}` ? 'ide-selected-bg' : 'ide-text-bright ide-h-hover'}`}
                          style={{ paddingLeft: '32px', paddingRight: '6px' }}
                          onClick={() => handleProjectFileClick(file.id, file.path)}
                        >
                          {/* File icon */}
                          {(() => {
                            const fileName = file.path.split('/').pop();
                            const s = getFileStyle(fileName);
                            return (
                              <span className="text-[10px] font-bold rounded px-0.5 shrink-0 leading-4"
                                style={{ color: s.color, backgroundColor: s.bg, minWidth: '18px', textAlign: 'center' }}>
                                {s.icon}
                              </span>
                            );
                          })()}
                          
                          {/* File name */}
                          <span className="truncate flex-1" title={file.path}>
                            {file.path.split('/').pop()}
                          </span>

                          {/* Unsaved indicator */}
                          {!file.saved && (
                            <span className="w-1.5 h-1.5 rounded-full ide-text-bright shrink-0" title="Unsaved"
                              style={{ backgroundColor: '#ffd700' }} />
                          )}

                          {/* Delete button */}
                          <button
                            className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-[#ff000044] ide-text-muted hover:text-[#f48771]"
                            onClick={(e) => handleRemoveProjectFile(file.id, e)}
                            title="Close file"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full ide-sidebar-bg select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 ide-text-header text-[11px] uppercase tracking-widest font-semibold shrink-0">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowNewItemDialog({ type: 'file', location: null }); setTimeout(() => newItemInputRef.current?.focus(), 50); }}
            className="p-1 rounded ide-h-btn ide-text-muted ide-h-text-bright" title="New File">
            <VscNewFile size={16} />
          </button>
          <button onClick={() => { setShowNewItemDialog({ type: 'folder', location: null }); setTimeout(() => newItemInputRef.current?.focus(), 50); }}
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
          <div className="text-[10px] ide-text-muted mb-1 truncate">
            {showNewItemDialog.location
              ? showNewItemDialog.location.startsWith('project:')
                ? `in ${projectManager.getProject(showNewItemDialog.location.replace('project:', ''))?.name || 'project'}`
                : `in ${showNewItemDialog.location}`
              : 'in root'}
          </div>
          <input
            ref={newItemInputRef}
            type="text"
            placeholder={showNewItemDialog.type === 'folder' ? 'Folder name…' : 'File name (e.g., index.jsx)'}
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
          <div className="px-4 py-4 ide-text-muted text-xs animate-pulse">Loading Files…</div>
        ) : files.length === 0 && projectsList.length === 0 ? (
          <div className="px-4 py-6 text-center ide-text-muted text-xs leading-relaxed">
            No files yet.<br />Click <strong className="ide-text-bright">+</strong> to create one or open a project.
          </div>
        ) : (
          <>
            {files.length > 0 && renderFileTree(files)}
            {renderProjectsSection()}
          </>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 ide-sidebar-bg border ide-border-inp-c rounded shadow-xl py-1 min-w-37.5 text-sm ide-text-bright"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {/* Folder context menu */}
          {contextMenu.type === 'folder' && (
            <>
              <button className="flex items-center gap-2 w-full px-3 py-1.5 ide-h-selected text-left"
                onClick={() => {
                  setContextMenu(null);
                  setShowNewItemDialog({ type: 'file', location: contextMenu.path });
                  setTimeout(() => newItemInputRef.current?.focus(), 50);
                }}>
                <FiFile size={13} /> New File
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-1.5 ide-h-selected text-left"
                onClick={() => {
                  setContextMenu(null);
                  setShowNewItemDialog({ type: 'folder', location: contextMenu.path });
                  setTimeout(() => newItemInputRef.current?.focus(), 50);
                }}>
                <FiFolderPlus size={13} /> New Folder
              </button>
              <div className="border-t ide-border-c my-1" />
              <button className="flex items-center gap-2 w-full px-3 py-1.5 ide-h-selected text-left"
                onClick={() => { setRenamingPath(contextMenu.path); setRenameValue(contextMenu.name); setContextMenu(null); }}>
                <FiEdit2 size={13} /> Rename
              </button>
              <div className="border-t ide-border-c my-1" />
              <button className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#5a1d1d] text-[#f48771] text-left"
                onClick={(e) => { handleDeleteFile(contextMenu.path, e); setContextMenu(null); }}>
                <FiTrash2 size={13} /> Delete
              </button>
            </>
          )}

          {/* Project context menu */}
          {contextMenu.type === 'project' && (
            <>
              <button className="flex items-center gap-2 w-full px-3 py-1.5 ide-h-selected text-left"
                onClick={() => {
                  setContextMenu(null);
                  setShowNewItemDialog({ type: 'file', location: `project:${contextMenu.id}` });
                  setTimeout(() => newItemInputRef.current?.focus(), 50);
                }}>
                <FiFile size={13} /> New File
              </button>
              <button className="flex items-center gap-2 w-full px-3 py-1.5 ide-h-selected text-left"
                onClick={() => {
                  setContextMenu(null);
                  setShowNewItemDialog({ type: 'folder', location: `project:${contextMenu.id}` });
                  setTimeout(() => newItemInputRef.current?.focus(), 50);
                }}>
                <FiFolderPlus size={13} /> New Folder
              </button>
              <div className="border-t ide-border-c my-1" />
              <button className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#5a1d1d] text-[#f48771] text-left"
                onClick={(e) => { handleCloseProject(contextMenu.id, e); setContextMenu(null); }}>
                <FiTrash2 size={13} /> Close Project
              </button>
            </>
          )}

          {/* File context menu (default) */}
          {contextMenu.type === 'file' && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
