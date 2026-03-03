import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import { FiX, FiSave, FiMenu, FiSearch, FiSettings, FiCommand } from 'react-icons/fi';
import FileExplorer from './FileExplorer';
import CommandPalette from './CommandPalette';
import SettingsPanel from './SettingsPanel';
import SearchPanel from './SearchPanel';
import * as api from '../utils/api';
import './VSCodeEditor.css';

export default function VSCodeEditor() {
  const [openFiles, setOpenFiles] = useState({});
  const [currentFile, setCurrentFile] = useState(null);
  const [isSaved, setIsSaved] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [allFiles, setAllFiles] = useState([]);
  const [settings, setSettings] = useState({
    fontSize: 14,
    wordWrap: true,
    minimap: true,
    autoSave: true,
    formatOnSave: true,
    theme: 'Dark',
    statusBar: true,
    lineNumbers: true,
  });
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const autoSaveTimeoutRef = useRef(null);

  // Load all files for search
  useEffect(() => {
    const loadAllFiles = async () => {
      try {
        const files = await api.listFiles();
        setAllFiles(files);
      } catch (error) {
        console.error('Error loading files:', error);
      }
    };
    loadAllFiles();
  }, []);

  // Build commands for palette
  const commands = [
    {
      id: 'save',
      category: 'File',
      name: 'Save',
      icon: '💾',
      shortcut: 'Ctrl+S',
      action: () => handleSaveFile()
    },
    {
      id: 'save-all',
      category: 'File',
      name: 'Save All',
      icon: '💾',
      shortcut: 'Ctrl+Shift+S',
      action: () => handleSaveAll()
    },
    {
      id: 'search',
      category: 'View',
      name: 'Search Files',
      icon: '🔍',
      shortcut: 'Ctrl+P',
      description: 'Search for files',
      action: () => setIsSearchOpen(true)
    },
    {
      id: 'settings',
      category: 'View',
      name: 'Settings',
      icon: '⚙️',
      shortcut: 'Ctrl+,',
      action: () => setIsSettingsOpen(true)
    },
    {
      id: 'toggle-sidebar',
      category: 'View',
      name: 'Toggle Sidebar',
      icon: '📁',
      action: () => setSidebarOpen(!sidebarOpen)
    },
    {
      id: 'close-file',
      category: 'Editor',
      name: 'Close Current File',
      icon: '❌',
      action: () => currentFile && handleCloseTab(currentFile)
    },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyP') {
        e.preventDefault();
        setIsPaletteOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyP') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'Comma') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle file selection from explorer
  const handleSelectFile = async (filePath) => {
    if (!openFiles[filePath]) {
      try {
        const content = await api.readFile(filePath);
        setOpenFiles(prev => ({
          ...prev,
          [filePath]: { content, saved: true }
        }));
      } catch (error) {
        toast.error('Failed to open file');
      }
    }
    setCurrentFile(filePath);
  };

  // Handle file content change
  const handleEditorChange = (value) => {
    if (currentFile) {
      setOpenFiles(prev => ({
        ...prev,
        [currentFile]: { content: value, saved: false }
      }));
      setIsSaved(false);

      // Auto-save after 2 seconds of inactivity
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSaveFile(currentFile);
      }, 2000);
    }
  };

  // Save current file
  const handleSaveFile = async (filePath = currentFile) => {
    if (!filePath) return;

    try {
      const content = openFiles[filePath].content;
      await api.updateFile(filePath, content);
      
      setOpenFiles(prev => ({
        ...prev,
        [filePath]: { content, saved: true }
      }));
      
      if (filePath === currentFile) {
        setIsSaved(true);
      }
      
      toast.success('File saved successfully');
    } catch (error) {
      toast.error('Failed to save file');
    }
  };

  // Save all files
  const handleSaveAll = async () => {
    const unsavedFiles = Object.keys(openFiles).filter(path => !openFiles[path].saved);
    
    for (const filePath of unsavedFiles) {
      await handleSaveFile(filePath);
    }
  };

  // Close tab
  const handleCloseTab = (filePath) => {
    const newOpenFiles = { ...openFiles };
    delete newOpenFiles[filePath];
    setOpenFiles(newOpenFiles);

    if (currentFile === filePath) {
      const remainingFiles = Object.keys(newOpenFiles);
      setCurrentFile(remainingFiles.length > 0 ? remainingFiles[0] : null);
    }
  };

  // Handle Monaco mount
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Custom theme
    monaco.editor.defineTheme('vscode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editor.lineNumbersBackground': '#1e1e1e',
        'editor.lineNumbersForeground': '#858585',
      },
    });

    // Keyboard shortcuts
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        handleSaveFile();
      }
    );

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
      () => {
        handleSaveAll();
      }
    );
  };

  return (
    <div className="vscode-editor">
      {/* Header */}
      <div className="editor-header">
        <div className="header-left">
          <button 
            className="toggle-sidebar"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
          >
            <FiMenu size={20} />
          </button>
          <div className="logo">VS Code Editor</div>
        </div>
        <div className="header-right">
          <button 
            className="icon-btn"
            onClick={() => setIsSearchOpen(true)}
            title="Search Files (Ctrl+P)"
          >
            <FiSearch size={18} />
          </button>
          <button 
            className="icon-btn"
            onClick={() => setIsPaletteOpen(true)}
            title="Command Palette (Ctrl+Shift+P)"
          >
            <FiCommand size={18} />
          </button>
          <button 
            className={`save-btn ${!isSaved ? 'unsaved' : ''}`}
            onClick={handleSaveFile}
            title="Save (Ctrl+S)"
          >
            <FiSave size={18} />
            {!isSaved && <span className="unsaved-indicator">●</span>}
          </button>
          <button 
            className="save-all-btn"
            onClick={handleSaveAll}
            title="Save All (Ctrl+Shift+S)"
          >
            Save All
          </button>
          <button 
            className="icon-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings (Ctrl+,)"
          >
            <FiSettings size={18} />
          </button>
        </div>
      </div>

      <div className="editor-container">
        {/* Sidebar - File Explorer */}
        {sidebarOpen && (
          <div className="editor-sidebar">
            <FileExplorer 
              onSelectFile={handleSelectFile}
              openFiles={openFiles}
              currentFile={currentFile}
              onOpenFile={handleSelectFile}
              onDeleteFile={(filePath) => handleCloseTab(filePath)}
            />
          </div>
        )}

        {/* Main editor area */}
        <div className="editor-main">
          {/* Tabs */}
          {Object.keys(openFiles).length > 0 && (
            <div className="editor-tabs">
              {Object.keys(openFiles).map(filePath => (
                <div 
                  key={filePath}
                  className={`tab ${currentFile === filePath ? 'active' : ''}`}
                  onClick={() => setCurrentFile(filePath)}
                >
                  <span className="tab-icon">{api.getFileIcon(filePath)}</span>
                  <span className="tab-name">{filePath.split('/').pop()}</span>
                  {!openFiles[filePath].saved && <span className="unsaved-dot">●</span>}
                  <button 
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(filePath);
                    }}
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor */}
          {currentFile ? (
            <div className="editor-wrapper">
              <Editor
                path={currentFile}
                language={api.getLanguageFromExtension(currentFile)}
                value={openFiles[currentFile].content}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme="vscode-dark"
                options={{
                  fontSize: settings.fontSize,
                  minimap: { enabled: settings.minimap },
                  wordWrap: settings.wordWrap ? 'on' : 'off',
                  lineNumbers: settings.lineNumbers ? 'on' : 'off',
                  automaticLayout: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  scrollBeyondLastLine: false,
                  fontFamily: "'Fira Code', 'Courier New', monospace",
                  lineHeight: 1.6,
                  padding: { top: 16, bottom: 16 },
                }}
              />
            </div>
          ) : (
            <div className="editor-empty">
              <div className="empty-content">
                <h2>Welcome to VS Code Editor</h2>
                <p>Open a file from the explorer to start editing</p>
                <p className="shortcuts">
                  <strong>Shortcuts:</strong>
                  <br />
                  Ctrl+S → Save
                  <br />
                  Ctrl+Shift+S → Save All
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {settings.statusBar && (
        <div className="editor-status-bar">
          <div className="status-left">
            {currentFile && (
              <>
                <span>{api.getLanguageFromExtension(currentFile).toUpperCase()}</span>
                <span>|</span>
                <span>{openFiles[currentFile]?.content.length || 0} characters</span>
              </>
            )}
          </div>
          <div className="status-right">
            <span>UTF-8</span>
            <span>|</span>
            <span>CRLF</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <CommandPalette 
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        commands={commands}
      />
      <SettingsPanel 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
      <SearchPanel 
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        files={allFiles}
        onSelectFile={handleSelectFile}
      />
    </div>
  );
}
