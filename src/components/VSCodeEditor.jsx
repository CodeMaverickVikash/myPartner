import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import {
  FiX, FiGitBranch, FiFile, FiPlus, FiChevronRight,
  FiAlertCircle, FiAlertTriangle, FiRefreshCw, FiCheck, FiChevronsLeft,
} from 'react-icons/fi';
import {
  VscFiles, VscSearch, VscSourceControl, VscTerminal, VscSettingsGear, VscListSelection,
} from 'react-icons/vsc';
import FileExplorer from './FileExplorer';
import CommandPalette from './CommandPalette';
import SettingsPanel from './SettingsPanel';
import SearchPanel from './SearchPanel';
import OpenProjectPanel from './OpenProjectPanel';
import AIPanel from './AIPanel';
import { useAutoSave } from '../utils/useAutoSave';
import { projectManager } from '../utils/projectManager';
import * as api from '../utils/api';
import aiContextManager from '../utils/AIContextManager';

export default function VSCodeEditor() {
  // ─── Files ────────────────────────────────────────────────────────────────
  const [openFiles, setOpenFiles]     = useState({});   // { path: {content,saved} }
  const [projectFiles, setProjectFiles] = useState({}); // { fileId: {fileData from projectManager} }
  const [currentFile, setCurrentFile] = useState(null);
  const [allFiles, setAllFiles]       = useState([]);

  // ─── UI panels ────────────────────────────────────────────────────────────
  const [activeActivity, setActiveActivity] = useState('explorer'); // explorer | search | git
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [bottomOpen, setBottomOpen]         = useState(false);
  const [activeBottom, setActiveBottom]     = useState('terminal'); // terminal | problems

  // ─── Modals ───────────────────────────────────────────────────────────────
  const [isPaletteOpen, setIsPaletteOpen]   = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFileSearchOpen, setIsFileSearchOpen] = useState(false);
  const [isProjectPanelOpen, setIsProjectPanelOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen]   = useState(false);

  // ─── Terminal ─────────────────────────────────────────────────────────────
  const [termHistory, setTermHistory] = useState([
    { type: 'system', text: 'Terminal ready. Type a command and press Enter. Ctrl+L to clear.' }
  ]);
  const [termInput, setTermInput]     = useState('');
  const [termBusy, setTermBusy]       = useState(false);
  const [termCmdHistory, setTermCmdHistory] = useState([]);
  const [termHistIdx, setTermHistIdx] = useState(-1);
  const [termCwd, setTermCwd]         = useState('');
  const termEndRef   = useRef(null);
  const termInputRef = useRef(null);

  // ─── Git ──────────────────────────────────────────────────────────────────
  const [gitChanges, setGitChanges]   = useState([]);
  const [gitBranch, setGitBranch]     = useState('');
  const [gitMsg, setGitMsg]           = useState('');
  const [gitLog, setGitLog]           = useState([]);

  // ─── Content Search ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchBusy, setSearchBusy]     = useState(false);

  // ─── Editor meta ──────────────────────────────────────────────────────────
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [problems, setProblems]   = useState([]);  // Monaco diagnostics markers

  // ─── Settings ─────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState({
    fontSize: 14, tabSize: 2, wordWrap: false, minimap: true,
    autoSave: false, formatOnSave: false, theme: 'Dark',
    statusBar: true, lineNumbers: true,
  });

  const editorRef        = useRef(null);
  const monacoRef        = useRef(null);
  const autoSaveTimer    = useRef(null);

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  useEffect(() => {
    refreshFiles();
    refreshGit();
  }, []);

  // ─── Auto-save on focus change (window blur) ──────────────────────────────
  useEffect(() => {
    const handleWindowBlur = async () => {
      // Save all unsaved project files
      const unsavedFiles = projectManager.getUnsavedFiles();
      if (unsavedFiles.length > 0) {
        try {
          await Promise.all(unsavedFiles.map(file => projectManager.saveFile(file.id)));
          toast.success(`Auto-saved ${unsavedFiles.length} file(s)`, { duration: 1500 });
        } catch (err) {
          console.error('Auto-save failed:', err);
          toast.error('Failed to auto-save files', { duration: 1500 });
        }
      }

      // Also save regular editor files if autoSave is enabled
      if (settings.autoSave) {
        const unsavedRegular = Object.entries(openFiles)
          .filter(([_, file]) => !file.saved)
          .map(([path, _]) => path);
        
        if (unsavedRegular.length > 0) {
          try {
            await Promise.all(unsavedRegular.map(path => handleSaveFile(path)));
          } catch (err) {
            console.error('Auto-save failed for regular files:', err);
          }
        }
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [openFiles, settings.autoSave]);

  // ─── Listen for project file open events ───────────────────────────────────
  useEffect(() => {
    const handleOpenProjectFile = (event) => {
      const { fileId, fileData, fileName } = event.detail;
      
      // Set current file to the project file
      setCurrentFile(`project:${fileId}`);
      
      // Add to project files if not already open
      if (!projectFiles[fileId]) {
        setProjectFiles(prev => ({
          ...prev,
          [fileId]: fileData
        }));
      }

      toast.success(`Opened: ${fileName}`, { duration: 1200 });
    };

    window.addEventListener('openProjectFile', handleOpenProjectFile);
    return () => window.removeEventListener('openProjectFile', handleOpenProjectFile);
  }, [projectFiles]);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [termHistory]);

  // apply Monaco theme when setting changes
  useEffect(() => {
    monacoRef.current?.editor.setTheme(
      settings.theme === 'Dark' ? 'vscode-dark' : 'vscode-light'
    );
  }, [settings.theme]);

  const refreshFiles = async () => {
    try { setAllFiles(await api.listFiles()); } catch (_) {}
  };

  const refreshGit = async () => {
    try {
      const st = await api.gitStatus();
      if (st.success) setGitChanges(st.changes || []);
      const br = await api.executeTerminalCommand('git branch --show-current');
      if (br.success) setGitBranch(br.output?.trim() || '');
      const lg = await api.gitLog(8);
      if (lg.success) setGitLog(lg.commits || []);
    } catch (_) {}
  };

  // ─── Command palette entries ──────────────────────────────────────────────
  const commands = [
    // File
    { id:'save',              category:'File',   name:'Save',                      icon:'💾', shortcut:'Ctrl+S',           action:() => handleSaveFile() },
    { id:'save-all',          category:'File',   name:'Save All',                  icon:'💾', shortcut:'Ctrl+Shift+S',     action:() => handleSaveAll() },
    { id:'go-to-file',        category:'File',   name:'Go to File…',               icon:'🔍', shortcut:'Ctrl+P',           action:() => setIsFileSearchOpen(true) },
    { id:'open-project',      category:'File',   name:'Open Project',              icon:'📂', shortcut:'Ctrl+Shift+O',     action:() => setIsProjectPanelOpen(true) },
    { id:'close-tab',         category:'File',   name:'Close Editor',              icon:'❌', shortcut:'Ctrl+W',           action:() => currentFile && handleCloseTab(currentFile) },
    // View
    { id:'toggle-sidebar',    category:'View',   name:'Toggle Sidebar',            icon:'📁', shortcut:'Ctrl+B',           action:() => setSidebarOpen(p => !p) },
    { id:'toggle-terminal',   category:'View',   name:'Toggle Terminal',           icon:'⬛', shortcut:'Ctrl+`',           action:() => toggleBottom('terminal') },
    { id:'toggle-problems',   category:'View',   name:'Toggle Problems Panel',     icon:'⚠️',                             action:() => toggleBottom('problems') },
    { id:'toggle-minimap',    category:'View',   name:'Toggle Minimap',            icon:'🗺️',                             action:() => setSettings(s => ({ ...s, minimap: !s.minimap })) },
    { id:'toggle-wordwrap',   category:'View',   name:'Toggle Word Wrap',          icon:'↩', shortcut:'Alt+Z',            action:() => setSettings(s => ({ ...s, wordWrap: !s.wordWrap })) },
    { id:'search-panel',      category:'View',   name:'View: Search',              icon:'🔎', shortcut:'Ctrl+Shift+F',     action:() => { setActiveActivity('search'); setSidebarOpen(true); } },
    { id:'settings',          category:'View',   name:'Open Settings',             icon:'⚙️', shortcut:'Ctrl+,',           action:() => setIsSettingsOpen(true) },
    // Editor – Intelligence
    { id:'go-to-def',         category:'Editor', name:'Go to Definition',          icon:'➡️', shortcut:'F12',              action:() => editorRef.current?.getAction('editor.action.revealDefinition')?.run() },
    { id:'peek-def',          category:'Editor', name:'Peek Definition',           icon:'👁️', shortcut:'Alt+F12',          action:() => editorRef.current?.getAction('editor.action.peekDefinition')?.run() },
    { id:'find-refs',         category:'Editor', name:'Find All References',       icon:'🔗', shortcut:'Shift+F12',        action:() => editorRef.current?.getAction('editor.action.goToReferences')?.run() },
    { id:'rename',            category:'Editor', name:'Rename Symbol',             icon:'✏️', shortcut:'F2',               action:() => editorRef.current?.getAction('editor.action.rename')?.run() },
    { id:'format',            category:'Editor', name:'Format Document',           icon:'🧹', shortcut:'Shift+Alt+F',      action:() => editorRef.current?.getAction('editor.action.formatDocument')?.run() },
    { id:'quick-fix',         category:'Editor', name:'Quick Fix…',               icon:'💡', shortcut:'Ctrl+.',           action:() => editorRef.current?.getAction('editor.action.quickFix')?.run() },
    { id:'go-symbol',         category:'Editor', name:'Go to Symbol in File…',    icon:'@',  shortcut:'Ctrl+Shift+O',     action:() => editorRef.current?.getAction('editor.action.gotoSymbol')?.run() },
    { id:'toggle-comment',    category:'Editor', name:'Toggle Line Comment',       icon:'#',  shortcut:'Ctrl+/',           action:() => editorRef.current?.getAction('editor.action.commentLine')?.run() },
    { id:'fold-all',          category:'Editor', name:'Fold All',                  icon:'▼',                              action:() => editorRef.current?.getAction('editor.foldAll')?.run() },
    { id:'unfold-all',        category:'Editor', name:'Unfold All',                icon:'▶',                              action:() => editorRef.current?.getAction('editor.unfoldAll')?.run() },
    { id:'next-problem',      category:'Editor', name:'Go to Next Problem',        icon:'⚠️', shortcut:'F8',               action:() => editorRef.current?.getAction('editor.action.marker.nextInFiles')?.run() },
    // Git
    { id:'git-panel',         category:'Git',    name:'View: Source Control',      icon:'🌿',                             action:() => { setActiveActivity('git'); setSidebarOpen(true); } },
    { id:'git-refresh',       category:'Git',    name:'Git: Refresh Status',       icon:'↻',                              action:() => refreshGit() },
    { id:'git-commit',        category:'Git',    name:'Git: Commit Staged',        icon:'✅',                             action:() => { setActiveActivity('git'); setSidebarOpen(true); } },
    // Theme
    { id:'theme-dark',        category:'Theme',  name:'Color Theme: Dark',         icon:'🌙',                             action:() => setSettings(s => ({ ...s, theme: 'Dark' })) },
    { id:'theme-light',       category:'Theme',  name:'Color Theme: Light',        icon:'☀️',                             action:() => setSettings(s => ({ ...s, theme: 'Light' })) },
  ];

  // ─── Global keyboard shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.shiftKey && e.code === 'KeyP') { e.preventDefault(); setIsPaletteOpen(true); }
      else if (e.shiftKey && e.code === 'KeyF') { e.preventDefault(); setActiveActivity('search'); setSidebarOpen(true); }
      else if (e.shiftKey && e.code === 'KeyS') { e.preventDefault(); handleSaveAll(); }
      else if (e.shiftKey && e.code === 'KeyA') { e.preventDefault(); setIsAIPanelOpen(p => !p); }
      else if (e.code === 'KeyP') { e.preventDefault(); setIsFileSearchOpen(true); }
      else if (e.code === 'Comma') { e.preventDefault(); setIsSettingsOpen(true); }
      else if (e.code === 'Backquote') { e.preventDefault(); toggleBottom('terminal'); }
      else if (e.code === 'KeyB') { e.preventDefault(); setSidebarOpen(p => !p); }
      else if (e.code === 'KeyS') { e.preventDefault(); handleSaveFile(); }
      else if (e.code === 'KeyW') { e.preventDefault(); if (currentFile) handleCloseTab(currentFile); }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [currentFile, openFiles]);

  // ─── Panel helpers ────────────────────────────────────────────────────────
  const toggleBottom = (panel) => {
    if (activeBottom === panel && bottomOpen) setBottomOpen(false);
    else { setActiveBottom(panel); setBottomOpen(true); }
    if (panel === 'terminal') setTimeout(() => termInputRef.current?.focus(), 80);
  };

  const switchActivity = (act) => {
    if (activeActivity === act && sidebarOpen) setSidebarOpen(false);
    else { setActiveActivity(act); setSidebarOpen(true); }
  };

  // ─── File operations ──────────────────────────────────────────────────────
  const handleSelectFile = async (filePath) => {
    if (!openFiles[filePath]) {
      try {
        const content = await api.readFile(filePath);
        setOpenFiles(prev => ({ ...prev, [filePath]: { content, saved: true } }));
      } catch (_) { toast.error('Failed to open file'); return; }
    }
    setCurrentFile(filePath);
  };

  const handleEditorChange = (value) => {
    if (!currentFile) return;
    
    // Handle project files
    if (currentFile.startsWith('project:')) {
      const fileId = currentFile.replace('project:', '');
      projectManager.updateFileContent(fileId, value ?? '');
      return;
    }

    // Handle regular files
    setOpenFiles(prev => ({ ...prev, [currentFile]: { content: value ?? '', saved: false } }));
    if (settings.autoSave) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => handleSaveFile(currentFile), 1000);
    }
  };

  const handleSaveFile = useCallback(async (filePath) => {
    const fp = filePath ?? currentFile;
    if (!fp || !openFiles[fp]) return;
    try {
      await api.updateFile(fp, openFiles[fp].content);
      setOpenFiles(prev => ({ ...prev, [fp]: { ...prev[fp], saved: true } }));
      toast.success('Saved', { duration: 1200 });
    } catch (_) { toast.error('Save failed'); }
  }, [currentFile, openFiles]);

  const handleSaveAll = useCallback(async () => {
    const unsaved = Object.keys(openFiles).filter(p => !openFiles[p].saved);
    await Promise.all(unsaved.map(p => handleSaveFile(p)));
    if (unsaved.length) toast.success(`Saved ${unsaved.length} file(s)`, { duration: 1500 });
  }, [openFiles, handleSaveFile]);

  const handleCloseTab = (filePath) => {
    if (!openFiles[filePath]?.saved) {
      if (!window.confirm('Unsaved changes – close anyway?')) return;
    }
    const next = { ...openFiles };
    delete next[filePath];
    setOpenFiles(next);
    if (currentFile === filePath) {
      const rem = Object.keys(next);
      setCurrentFile(rem.length ? rem[rem.length - 1] : null);
    }
  };

  // ─── Monaco beforeMount – configure language services once ───────────────
  const handleEditorBeforeMount = (monaco) => {
    // ── TypeScript compiler options (mirrors tsconfig strict mode) ─────────
    const tsOpts = {
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      lib: ['esnext', 'dom', 'dom.iterable', 'esnext.intl'],
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
      skipLibCheck: true,
      strict: false,
      noImplicitAny: false,
    };
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(tsOpts);
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({ ...tsOpts, checkJs: false });

    // ── Enable diagnostics (red/yellow squiggles) ───────────────────────────
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: false,
    });

    // ── Eager model sync so IntelliSense works immediately ──────────────────
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

    // ── React + DOM type stubs for IntelliSense ──────────────────────────────
    const reactTypes = `
declare module 'react' {
  export type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactFragment;
  export interface ReactElement<P = any> { type: any; props: P; key: string | null; }
  export type ReactFragment = ReactElement | ReactNode[];
  export type FC<P = {}> = FunctionComponent<P>;
  export interface FunctionComponent<P = {}> { (props: P & { children?: ReactNode }): ReactElement | null; displayName?: string; }
  export function useState<S>(init: S | (() => S)): [S, (val: S | ((prev: S) => S)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useRef<T = undefined>(init?: T): { current: T };
  export function useContext<T>(ctx: Context<T>): T;
  export function useReducer<S, A>(reducer: (s: S, a: A) => S, init: S): [S, (action: A) => void];
  export function createContext<T>(defaultValue: T): Context<T>;
  export interface Context<T> { Provider: FC<{ value: T }>; Consumer: any; }
  export function forwardRef<T, P = {}>(render: (props: P, ref: any) => ReactElement | null): FC<P & { ref?: any }>;
  export function memo<T extends FC<any>>(component: T): T;
  export function createRef<T>(): { current: T | null };
  export const Fragment: FC<{}>;
  export default { useState, useEffect, useCallback, useMemo, useRef, createContext, forwardRef, memo, Fragment };
}
declare module 'react-dom' {
  export function render(element: any, container: Element | null): void;
  export function createRoot(container: Element): { render(element: any): void; unmount(): void; };
}
declare module 'react-dom/client' {
  export function createRoot(container: Element): { render(element: any): void; unmount(): void; };
}
`;
    monaco.languages.typescript.typescriptDefaults.addExtraLib(reactTypes, 'file:///node_modules/@types/react/index.d.ts');
    monaco.languages.typescript.javascriptDefaults.addExtraLib(reactTypes, 'file:///node_modules/@types/react/index.d.ts');

    // ── CSS custom completions ───────────────────────────────────────────────
    monaco.languages.registerCompletionItemProvider('css', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = { startLineNumber: position.lineNumber, startColumn: word.startColumn, endLineNumber: position.lineNumber, endColumn: word.endColumn };
        const cssProps = ['display', 'flex', 'grid', 'position', 'color', 'background', 'background-color', 'border', 'border-radius', 'padding', 'margin', 'width', 'height', 'font-size', 'font-weight', 'font-family', 'text-align', 'overflow', 'z-index', 'opacity', 'transition', 'transform', 'animation', 'cursor', 'box-shadow', 'gap', 'align-items', 'justify-content', 'flex-direction', 'flex-wrap', 'grid-template-columns', 'grid-template-rows'];
        return { suggestions: cssProps.map(p => ({ label: p, kind: monaco.languages.CompletionItemKind.Property, insertText: p + ': ', range })) };
      }
    });

    // ── VSCode Dark theme (full token set) ───────────────────────────────────
    monaco.editor.defineTheme('vscode-dark', {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: 'comment',           foreground: '6A9955', fontStyle: 'italic' },
        { token: 'comment.doc',       foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword',           foreground: 'C586C0' },
        { token: 'keyword.operator',  foreground: 'D4D4D4' },
        { token: 'keyword.control',   foreground: 'C586C0' },
        { token: 'string',            foreground: 'CE9178' },
        { token: 'string.escape',     foreground: 'D7BA7D' },
        { token: 'number',            foreground: 'B5CEA8' },
        { token: 'regexp',            foreground: 'D16969' },
        { token: 'type',              foreground: '4EC9B0' },
        { token: 'type.identifier',   foreground: '4EC9B0' },
        { token: 'class',             foreground: '4EC9B0' },
        { token: 'interface',         foreground: '4EC9B0' },
        { token: 'function',          foreground: 'DCDCAA' },
        { token: 'method',            foreground: 'DCDCAA' },
        { token: 'variable',          foreground: '9CDCFE' },
        { token: 'variable.constant', foreground: '4FC1FF' },
        { token: 'parameter',         foreground: '9CDCFE' },
        { token: 'property',          foreground: '9CDCFE' },
        { token: 'attribute.name',    foreground: '9CDCFE' },
        { token: 'attribute.value',   foreground: 'CE9178' },
        { token: 'tag',               foreground: '4EC9B0' },
        { token: 'delimiter',         foreground: 'D4D4D4' },
        { token: 'delimiter.html',    foreground: '808080' },
        { token: 'delimiter.xml',     foreground: '808080' },
        { token: 'metatag',           foreground: 'CE9178' },
        { token: 'metatag.content',   foreground: 'CE9178' },
        { token: 'key',               foreground: '9CDCFE' },
        { token: 'annotation',        foreground: 'DCDCAA' },
        { token: 'operator',          foreground: 'D4D4D4' },
        { token: 'namespace',         foreground: '4EC9B0' },
        { token: 'macro',             foreground: 'DCDCAA' },
        { token: 'decorator',         foreground: 'DCDCAA' },
      ],
      colors: {
        'editor.background':                   '#1e1e1e',
        'editor.foreground':                   '#d4d4d4',
        'editorLineNumber.foreground':         '#858585',
        'editorLineNumber.activeForeground':   '#c6c6c6',
        'editorCursor.foreground':             '#AEAFAD',
        'editor.selectionBackground':          '#264f78',
        'editor.inactiveSelectionBackground':  '#3a3d41',
        'editor.lineHighlightBackground':      '#2a2d2e',
        'editorIndentGuide.background1':       '#404040',
        'editorIndentGuide.activeBackground1': '#707070',
        'editorBracketMatch.background':       '#0d3a58',
        'editorBracketMatch.border':           '#888888',
        'editorWidget.background':             '#252526',
        'editorWidget.border':                 '#454545',
        'editorSuggestWidget.background':      '#252526',
        'editorSuggestWidget.border':          '#454545',
        'editorSuggestWidget.selectedBackground': '#094771',
        'editorHoverWidget.background':        '#252526',
        'editorHoverWidget.border':            '#454545',
        'editorGutter.background':             '#1e1e1e',
        'scrollbarSlider.background':          '#424242aa',
        'scrollbarSlider.hoverBackground':     '#646464aa',
        'scrollbarSlider.activeBackground':    '#bfbfbfaa',
        'minimap.background':                  '#1e1e1e',
        'focusBorder':                         '#007fd4',
      },
    });

    monaco.editor.defineTheme('vscode-light', {
      base: 'vs', inherit: true,
      rules: [
        { token: 'comment', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background':             '#ffffff',
        'editor.lineHighlightBackground': '#f3f3f3',
        'editorSuggestWidget.background': '#f3f3f3',
        'editorHoverWidget.background':   '#f3f3f3',
      },
    });
  };

  // ─── Monaco onMount – theme + WebStorm shortcuts + diagnostics ──────────
  const handleEditorMount = (editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    monaco.editor.setTheme(settings.theme === 'Dark' ? 'vscode-dark' : 'vscode-light');

    editor.onDidChangeCursorPosition(e => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });

    // ── File save shortcuts ────────────────────────────────────────────────
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => handleSaveFile());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => handleSaveAll());

    // ── WebStorm-style navigation shortcuts ───────────────────────────────
    // F12 → Go to Definition
    editor.addCommand(monaco.KeyCode.F12, () => {
      editor.getAction('editor.action.revealDefinition')?.run();
    });
    // Alt+F12 → Peek Definition (inline)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F12, () => {
      editor.getAction('editor.action.peekDefinition')?.run();
    });
    // Shift+F12 → Find All References
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F12, () => {
      editor.getAction('editor.action.goToReferences')?.run();
    });
    // F2 → Rename Symbol (WebStorm: Shift+F6)
    editor.addCommand(monaco.KeyCode.F2, () => {
      editor.getAction('editor.action.rename')?.run();
    });
    // Shift+Alt+F → Format Document  (WebStorm: Ctrl+Alt+L)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      editor.getAction('editor.action.formatDocument')?.run();
    });
    // Ctrl+D → Select next occurrence (like WebStorm Ctrl+G)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
      editor.getAction('editor.action.addSelectionToNextFindMatch')?.run();
    });
    // Ctrl+/ → Toggle line comment
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.getAction('editor.action.commentLine')?.run();
    });
    // Ctrl+Shift+K → Delete line (WebStorm: Ctrl+Y)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
      editor.getAction('editor.action.deleteLines')?.run();
    });
    // Alt+Shift+↑/↓ → Move line up/down (WebStorm: Shift+Alt+↑/↓)
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.UpArrow, () => {
      editor.getAction('editor.action.moveLinesUpAction')?.run();
    });
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.DownArrow, () => {
      editor.getAction('editor.action.moveLinesDownAction')?.run();
    });
    // Ctrl+Shift+O → Go to Symbol
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO, () => {
      editor.getAction('editor.action.gotoSymbol')?.run();
    });
    // F8 → Go to Next Problem
    editor.addCommand(monaco.KeyCode.F8, () => {
      editor.getAction('editor.action.marker.nextInFiles')?.run();
    });
    // Shift+F8 → Go to Previous Problem
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F8, () => {
      editor.getAction('editor.action.marker.prevInFiles')?.run();
    });
    // Ctrl+Space → Trigger suggestions
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      editor.getAction('editor.action.triggerSuggest')?.run();
    });
    // Ctrl+Shift+Space → Trigger parameter hints
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Space, () => {
      editor.getAction('editor.action.triggerParameterHints')?.run();
    });

    // ── Live diagnostics → Problems panel ─────────────────────────────────
    const refreshMarkers = () => {
      const allMarkers = [];
      monaco.editor.getModels().forEach(model => {
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        markers.forEach(m => {
          allMarkers.push({
            file:     model.uri.path.split('/').pop(),
            fullPath: model.uri.path,
            message:  m.message,
            severity: m.severity, // 1=hint 2=info 4=warning 8=error
            line:     m.startLineNumber,
            col:      m.startColumn,
            source:   m.source || '',
          });
        });
      });
      // Sort: errors first, then warnings
      allMarkers.sort((a, b) => b.severity - a.severity);
      setProblems(allMarkers);
    };

    // Refresh once after a delay (so TS has time to analyze)
    setTimeout(refreshMarkers, 1500);

    // And re-check whenever markers change globally
    monaco.editor.onDidChangeMarkers(() => refreshMarkers());
  };

  // ─── Terminal ─────────────────────────────────────────────────────────────
  const handleTermKey = async (e) => {
    // Ctrl+L → clear terminal
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setTermHistory([{ type: 'system', text: 'Terminal cleared.' }]);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = Math.min(termHistIdx + 1, termCmdHistory.length - 1);
      setTermHistIdx(idx);
      setTermInput(termCmdHistory[idx] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = Math.max(termHistIdx - 1, -1);
      setTermHistIdx(idx);
      setTermInput(idx === -1 ? '' : termCmdHistory[idx]);
      return;
    }
    if (e.key !== 'Enter') return;
    const cmd = termInput.trim();
    if (!cmd) return;
    if (cmd === 'clear' || cmd === 'cls') {
      setTermHistory([{ type: 'system', text: 'Terminal cleared. Ctrl+L also clears.' }]);
      setTermInput('');
      return;
    }
    setTermInput('');
    setTermHistIdx(-1);
    setTermCmdHistory(prev => [cmd, ...prev.slice(0, 49)]);
    const promptPrefix = termCwd ? `${termCwd.split(/[/\\]/).pop()} $` : '$';
    setTermHistory(prev => [...prev, { type: 'input', text: `${promptPrefix} ${cmd}` }]);
    setTermBusy(true);
    try {
      const res = await api.executeTerminalCommand(cmd);
      if (res.cwd) setTermCwd(res.cwd);
      const out = res.output?.trim() || (res.success ? '' : res.error || 'No output.');
      if (out) setTermHistory(prev => [...prev, { type: res.success ? 'output' : 'error', text: out }]);
    } catch (err) {
      setTermHistory(prev => [...prev, { type: 'error', text: `Error: ${err.message}` }]);
    } finally { setTermBusy(false); }
  };

  // ─── Git ──────────────────────────────────────────────────────────────────
  const handleGitInit = async () => {
    try { const r = await api.gitInit(); toast.success(r.output || 'Repo initialised'); refreshGit(); }
    catch (_) { toast.error('git init failed'); }
  };
  const handleGitAdd = async (f = '.') => {
    try { await api.gitAdd(f); toast.success('Staged'); refreshGit(); }
    catch (_) { toast.error('git add failed'); }
  };
  const handleGitCommit = async () => {
    if (!gitMsg.trim()) { toast.error('Enter a commit message'); return; }
    try { await api.gitCommit(gitMsg); setGitMsg(''); toast.success('Committed!'); refreshGit(); }
    catch (_) { toast.error('Commit failed'); }
  };

  // ─── Content search ───────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setSearchBusy(true);
      try {
        const results = await api.searchInFiles(searchQuery);
        setSearchResults(results);
      } catch (_) { toast.error('Search failed'); }
      finally { setSearchBusy(false); }
    }
  };

  // Shared activity-bar button style helper
  const actBtn = (act) =>
    `relative flex items-center justify-center w-12 h-12 transition-colors
     ${activeActivity === act && sidebarOpen
       ? 'text-white border-l-2 border-[#007acc] ide-actbar-active-bg'
       : 'ide-text-muted ide-h-text-white border-l-2 border-transparent'}`;

  // Git status badge color
  const gitBadgeColor = (s) => ({
    M: 'bg-[#1a7fd4] text-white', A: 'bg-[#1db954] text-black',
    D: 'bg-[#d4463a] text-white', R: 'bg-[#d4a017] text-black',
  }[s] || 'bg-[#858585] text-white');

  return (
    <div data-theme={settings.theme === 'Light' ? 'light' : 'dark'}
      className="flex flex-col h-screen w-screen ide-base-bg ide-text overflow-hidden">

      {/* ── Main row: Activity Bar + Workbench ──────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Activity Bar */}
        <div className="flex flex-col justify-between w-12 shrink-0 ide-actbar-bg border-r ide-border-sub-c">
          <div className="flex flex-col">
            <button className={actBtn('explorer')} onClick={() => switchActivity('explorer')} title="Explorer (Ctrl+B)">
              <VscFiles size={22} />
            </button>
            <button className={actBtn('search')} onClick={() => switchActivity('search')} title="Search (Ctrl+Shift+F)">
              <VscSearch size={22} />
            </button>
            <button className={actBtn('git')} onClick={() => switchActivity('git')} title="Source Control">
              <VscSourceControl size={22} />
              {gitChanges.length > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-4 h-4 rounded-full bg-[#0e639c] text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                  {gitChanges.length}
                </span>
              )}
            </button>
            <button 
              className={`flex items-center justify-center w-12 h-12 relative hover:bg-[#404854] ${
                isAIPanelOpen ? 'bg-[#404854] text-[#3b82f6]' : 'ide-text-muted ide-h-text-white'
              }`}
              onClick={() => setIsAIPanelOpen(p => !p)} 
              title="AI Assistant (Ctrl+Shift+A)">
              <span style={{ fontSize: '18px' }}>⚡</span>
            </button>
          </div>
          <div className="flex flex-col pb-1">
            <button className="flex items-center justify-center w-12 h-12 ide-text-muted ide-h-text-white"
              onClick={() => setIsPaletteOpen(true)} title="Command Palette (Ctrl+Shift+P)">
              <VscListSelection size={20} />
            </button>
            <button className="flex items-center justify-center w-12 h-12 ide-text-muted ide-h-text-white"
              onClick={() => setIsSettingsOpen(true)} title="Settings (Ctrl+,)">
              <VscSettingsGear size={22} />
            </button>
          </div>
        </div>

        {/* Workbench */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="flex flex-col w-64 shrink-0 ide-sidebar-bg border-r ide-border-sub-c overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b ide-border-c shrink-0">
                <span className="text-[10px] uppercase tracking-widest ide-text-header font-semibold">
                  {activeActivity === 'explorer' ? 'Explorer' : activeActivity === 'search' ? 'Search' : 'Source Control'}
                </span>
                <button className="ide-text-muted ide-h-text-white p-0.5 rounded ide-h-btn"
                  onClick={() => setSidebarOpen(false)} title="Close Sidebar">
                  <FiChevronsLeft size={15} />
                </button>
              </div>

              {/* ── Explorer ── */}
              {activeActivity === 'explorer' && (
                <div className="flex-1 overflow-hidden">
                  <FileExplorer
                    onSelectFile={handleSelectFile}
                    openFiles={openFiles}
                    currentFile={currentFile}
                    onOpenFile={handleSelectFile}
                    onDeleteFile={(fp) => {
                      const next = { ...openFiles };
                      delete next[fp];
                      setOpenFiles(next);
                      if (currentFile === fp) {
                        const rem = Object.keys(next);
                        setCurrentFile(rem.length ? rem[rem.length - 1] : null);
                      }
                      refreshFiles();
                    }}
                  />
                </div>
              )}

              {/* ── Content Search ── */}
              {activeActivity === 'search' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 px-2 py-1.5 border-b ide-border-c shrink-0">
                    <VscSearch size={13} className="ide-text-muted shrink-0" />
                    <input
                      className="flex-1 ide-input-bg ide-text-bright text-xs px-2 py-1 rounded border ide-border-inp-c outline-none focus:ide-accent-border"
                      placeholder="Search in files… (Enter)"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearch}
                      autoFocus
                    />
                    {searchBusy && <span className="ide-text-muted animate-spin text-xs">⟳</span>}
                  </div>
                  <div className="flex-1 overflow-y-auto py-1 text-xs">
                    {!searchQuery && <div className="px-3 py-4 ide-text-muted">Type and press Enter to search</div>}
                    {searchQuery && !searchBusy && searchResults.length === 0 && (
                      <div className="px-3 py-4 ide-text-muted">No results for "{searchQuery}"</div>
                    )}
                    {searchResults.map(r => (
                      <div key={r.file} className="mb-1">
                        <div className="flex items-center gap-1 px-2 py-1 ide-text-bright cursor-pointer ide-h-hover font-medium"
                          onClick={() => handleSelectFile(r.file)}>
                          <FiFile size={11} className="shrink-0" />
                          <span className="flex-1 truncate">{r.file}</span>
                          <span className="text-[#0e639c] font-bold">{r.matches.length}</span>
                        </div>
                        {r.matches.map((m, i) => (
                          <div key={i} className="flex gap-2 px-4 py-0.5 cursor-pointer ide-h-hover ide-text-muted"
                            onClick={() => handleSelectFile(r.file)}>
                            <span className="text-[#569cd6] w-8 shrink-0 text-right">{m.line}</span>
                            <span className="truncate">{m.content?.substring(0, 80)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Git ── */}
              {activeActivity === 'git' && (
                <div className="flex flex-col flex-1 overflow-hidden text-xs">
                  {/* Branch bar */}
                  <div className="flex items-center gap-1.5 px-2 py-1.5 border-b ide-border-c shrink-0 ide-text-bright">
                    <FiGitBranch size={12} className="shrink-0" />
                    <span className="flex-1 truncate font-medium">{gitBranch || 'no branch'}</span>
                    <button className="p-0.5 rounded ide-h-btn ide-text-muted ide-h-text-white" onClick={refreshGit} title="Refresh">
                      <FiRefreshCw size={11} />
                    </button>
                  </div>
                  {/* Commit box */}
                  <div className="px-2 py-2 border-b ide-border-c shrink-0">
                    <input
                      className="w-full ide-input-bg ide-text-bright px-2 py-1.5 rounded border ide-border-inp-c outline-none focus:ide-accent-border mb-1.5"
                      placeholder="Commit message (Ctrl+Enter)"
                      value={gitMsg}
                      onChange={e => setGitMsg(e.target.value)}
                      onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleGitCommit(); }}
                    />
                    <div className="flex gap-1.5">
                      <button className="flex-1 py-1 rounded ide-btn-bg ide-h-btn-dk ide-text-bright"
                        onClick={() => handleGitAdd('.')}>Stage All</button>
                      <button className="flex-1 py-1 rounded bg-[#0e639c] hover:bg-[#1177bb] text-white font-medium"
                        onClick={handleGitCommit}>Commit</button>
                    </div>
                  </div>
                  {/* Changes list */}
                  <div className="flex-1 overflow-y-auto">
                    {gitChanges.length > 0 ? (
                      <div>
                        <div className="px-2 py-1 ide-text-muted uppercase tracking-widest font-semibold text-[10px]">
                          Changes ({gitChanges.length})
                        </div>
                        {gitChanges.map(c => (
                          <div key={c.path || c.file} className="flex items-center gap-1.5 px-2 py-0.5 ide-h-hover group">
                            <span className={`text-[9px] font-bold px-1 rounded shrink-0 ${gitBadgeColor(c.status || 'M')}`}>
                              {c.status || 'M'}
                            </span>
                            <span className="flex-1 truncate ide-text-bright cursor-pointer"
                              onClick={() => handleSelectFile(c.path || c.file)}>{c.path || c.file}</span>
                            <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded ide-h-btn ide-text-muted"
                              onClick={() => handleGitAdd(c.path || c.file)} title="Stage">
                              <FiPlus size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-4 ide-text-muted">No changes detected</div>
                    )}
                    {gitLog.length > 0 && (
                      <div className="mt-1 border-t ide-border-c">
                        <div className="px-2 py-1 ide-text-muted uppercase tracking-widest font-semibold text-[10px]">Commits</div>
                        {gitLog.map((c, i) => (
                          <div key={i} className="flex items-baseline gap-1.5 px-2 py-0.5 ide-h-hover">
                            <span className="text-[#569cd6] font-mono shrink-0">{c.hash?.slice(0, 7)}</span>
                            <span className="truncate ide-text-bright">{c.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="px-2 py-2 border-t ide-border-c mt-auto">
                      <button className="w-full py-1 rounded ide-btn-bg ide-h-btn-dk ide-text-bright"
                        onClick={handleGitInit}>git init</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Editor Area ── */}
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Tab bar */}
            {(Object.keys(openFiles).length > 0 || Object.keys(projectFiles).length > 0) && (
              <div className="flex overflow-x-auto shrink-0 ide-tab-bg border-b ide-border-sub-c"
                style={{ scrollbarWidth: 'none' }}>
                {/* Regular files */}
                {Object.keys(openFiles).map(fp => (
                  <div key={fp}
                    className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs whitespace-nowrap border-r ide-border-sub-c shrink-0 group transition-colors
                      ${currentFile === fp
                        ? 'ide-base-bg ide-text border-t-2 border-t-(--ide-accent)'
                        : 'ide-tab-bg ide-text-muted ide-h-btn ide-h-text-bright border-t-2 border-t-transparent'}`}
                    onClick={() => setCurrentFile(fp)}>
                    <span className="text-[10px]">{api.getFileIcon(fp)}</span>
                    <span>{fp.split('/').pop()}</span>
                    {!openFiles[fp].saved && (
                      <span className="w-1.5 h-1.5 rounded-full ide-text-bright shrink-0" title="Unsaved" style={{ backgroundColor: 'var(--ide-text-bright)' }} />
                    )}
                    <button
                      className="opacity-0 group-hover:opacity-100 ml-0.5 rounded p-0.5 hover:bg-[#ffffff22] ide-text-muted ide-h-text-bright"
                      onClick={e => { e.stopPropagation(); handleCloseTab(fp); }} title="Close">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                {/* Project files */}
                {Object.keys(projectFiles).map(fileId => {
                  const file = projectFiles[fileId];
                  const displayFileId = `project:${fileId}`;
                  const fileName = file.path ? file.path.split('/').pop() : 'Untitled';
                  return (
                    <div key={displayFileId}
                      className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer text-xs whitespace-nowrap border-r ide-border-sub-c shrink-0 group transition-colors
                        ${currentFile === displayFileId
                          ? 'ide-base-bg ide-text border-t-2 border-t-(--ide-accent)'
                          : 'ide-tab-bg ide-text-muted ide-h-btn ide-h-text-bright border-t-2 border-t-transparent'}`}
                      onClick={() => setCurrentFile(displayFileId)}>
                      <span className="text-[10px]">📄</span>
                      <span>{fileName}</span>
                      {!file.saved && (
                        <span className="w-1.5 h-1.5 rounded-full ide-text-bright shrink-0" title="Unsaved" style={{ backgroundColor: 'var(--ide-text-bright)' }} />
                      )}
                      <button
                        className="opacity-0 group-hover:opacity-100 ml-0.5 rounded p-0.5 hover:bg-[#ffffff22] ide-text-muted ide-h-text-bright"
                        onClick={e => { e.stopPropagation(); projectManager.removeFile(fileId); setProjectFiles(prev => { const next = {...prev}; delete next[fileId]; return next; }); }} title="Close">
                        <FiX size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Breadcrumb */}
            {settings.breadcrumbs !== false && currentFile && (
              <div className="flex items-center gap-0 px-3 py-0.5 ide-base-bg border-b ide-border-c text-xs ide-text-muted shrink-0 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}>
                {(currentFile.startsWith('project:') 
                  ? projectFiles[currentFile.replace('project:', '')]?.path?.split('/') ?? [currentFile]
                  : currentFile.split('/')).map((seg, i, arr) => (
                  <span key={i} className="flex items-center gap-0">
                    {i > 0 && <FiChevronRight size={10} className="mx-1 opacity-50" />}
                    <span className={i === arr.length - 1 ? 'ide-text-bright' : 'ide-h-text-bright cursor-pointer'}>{seg}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Monaco / Welcome */}
            <div className="flex-1 overflow-hidden">
              {currentFile ? (
                <Editor
                  key={currentFile}
                  path={currentFile}
                  language={currentFile.startsWith('project:') ? 'plaintext' : api.getLanguageFromExtension(currentFile)}
                  value={
                    currentFile.startsWith('project:')
                      ? projectFiles[currentFile.replace('project:', '')]?.content ?? ''
                      : openFiles[currentFile]?.content ?? ''
                  }
                  onChange={handleEditorChange}
                  beforeMount={handleEditorBeforeMount}
                  onMount={handleEditorMount}
                  theme={settings.theme === 'Dark' ? 'vscode-dark' : 'vscode-light'}
                  options={{
                    fontSize: settings.fontSize,
                    tabSize: settings.tabSize || 2,
                    insertSpaces: true,
                    detectIndentation: true,
                    minimap: { enabled: settings.minimap !== false, scale: 1, renderCharacters: false },
                    wordWrap: settings.wordWrap ? 'on' : 'off',
                    lineNumbers: settings.lineNumbers !== false ? 'on' : 'off',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    padding: { top: 10, bottom: 10 },
                    fontFamily: settings.fontFamily || "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', monospace",
                    fontLigatures: true,
                    lineHeight: 22,
                    letterSpacing: 0.3,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    cursorStyle: 'line',
                    formatOnPaste: true,
                    formatOnType: true,
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoIndent: 'full',
                    snippetSuggestions: 'top',
                    tabCompletion: 'on',
                    quickSuggestions: { other: true, comments: true, strings: true },
                    quickSuggestionsDelay: 50,
                    parameterHints: { enabled: true, cycle: true },
                    inlayHints: { enabled: 'on' },
                    suggest: {
                      showMethods: true, showFunctions: true, showConstructors: true,
                      showFields: true, showVariables: true, showClasses: true,
                      showModules: true, showProperties: true, showKeywords: true,
                      showWords: true, showColors: true, showFiles: true,
                      showReferences: true, showSnippets: true, showEnums: true,
                      showEnumMembers: true, filterGraceful: true, insertMode: 'replace',
                    },
                    renderLineHighlight: 'all',
                    bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
                    guides: { bracketPairs: true, indentation: true, highlightActiveBracketPair: true },
                    smoothScrolling: true,
                    mouseWheelZoom: true,
                    renderWhitespace: 'selection',
                    renderControlCharacters: false,
                    folding: true,
                    foldingHighlight: true,
                    showFoldingControls: 'mouseover',
                    lightbulb: { enabled: 'on' },
                    codeLens: true,
                    colorDecorators: true,
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full ide-base-bg">
                  <div className="text-center max-w-sm">
                    <div className="text-6xl mb-4 opacity-20">⬡</div>
                    <h2 className="ide-text-bright text-xl font-light mb-1">VS Code Editor</h2>
                    <p className="ide-text-muted text-sm mb-6">Open a file from the Explorer or create a new one</p>
                    <div className="grid grid-cols-2 gap-1.5 text-left">
                      {[
                        ['Ctrl+P', 'Go to File'],
                        ['Ctrl+Shift+P', 'Command Palette'],
                        ['Ctrl+Shift+F', 'Search in Files'],
                        ['Ctrl+`', 'Toggle Terminal'],
                        ['Ctrl+B', 'Toggle Sidebar'],
                        ['Ctrl+S', 'Save File'],
                        ['Ctrl+Shift+S', 'Save All'],
                        ['Ctrl+,', 'Open Settings'],
                      ].map(([k, d]) => (
                        <div key={k} className="flex items-center gap-2 px-2 py-1 rounded ide-tab-bg">
                          <kbd className="text-[10px] border ide-border-inp-c rounded px-1 ide-text-muted font-mono whitespace-nowrap">{k}</kbd>
                          <span className="ide-text-muted text-xs truncate">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Panel */}
            {bottomOpen && (
              <div className="flex flex-col ide-base-bg border-t ide-border-c" style={{ height: '220px' }}>
                {/* Tab bar */}
                <div className="flex items-center shrink-0 ide-sidebar-bg border-b ide-border-c">
                  {[['terminal', 'TERMINAL', <VscTerminal size={12} />], ['problems', 'PROBLEMS', <FiAlertCircle size={12} />]].map(([id, label, icon]) => (
                    <button key={id}
                      className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium border-t-2 transition-colors
                        ${activeBottom === id
                          ? 'ide-text-bright border-t-(--ide-accent) ide-base-bg'
                          : 'ide-text-muted border-t-transparent ide-h-text-bright'}`}
                      onClick={() => toggleBottom(id)}>
                      {icon}{label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button className="p-1.5 mr-1 ide-text-muted ide-h-text-white rounded ide-h-btn"
                    onClick={() => setBottomOpen(false)} title="Close Panel"><FiX size={13} /></button>
                </div>

                {activeBottom === 'terminal' && (
                  <div className="flex flex-col flex-1 overflow-hidden bg-[#1e1e1e] font-mono text-sm cursor-text"
                    onClick={() => termInputRef.current?.focus()}>
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                      {termHistory.map((l, i) => (
                        <div key={i} className={`whitespace-pre-wrap break-all leading-5
                          ${l.type === 'input'  ? 'text-[#569cd6]' :
                            l.type === 'error'  ? 'text-[#f48771]' :
                            l.type === 'system' ? 'text-[#858585] italic' : 'text-[#d4d4d4]'}`}>
                          {l.text}
                        </div>
                      ))}
                      {termBusy && <div className="text-[#858585] italic animate-pulse">Running…</div>}
                      <div ref={termEndRef} />
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-[#3e3e42] shrink-0">
                      {termCwd && (
                        <span className="text-[#4ec9b0] text-xs shrink-0">
                          {termCwd.split(/[/\\]/).pop()}
                        </span>
                      )}
                      <span className="text-[#569cd6] font-bold shrink-0">❯</span>
                      <input
                        ref={termInputRef}
                        className="flex-1 bg-transparent text-[#d4d4d4] outline-none placeholder-[#555] min-w-0"
                        value={termInput}
                        onChange={e => setTermInput(e.target.value)}
                        onKeyDown={handleTermKey}
                        placeholder={termBusy ? 'Running…' : 'Enter command…'}
                        disabled={termBusy}
                        spellCheck={false}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                )}

                {activeBottom === 'problems' && (
                  <div className="flex-1 overflow-y-auto text-xs font-mono">
                    {problems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full ide-text-muted gap-2">
                        <FiCheck size={28} className="text-[#1db954]" />
                        <p>No problems detected in workspace</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {problems.map((p, i) => (
                          <div key={i}
                            className="flex items-start gap-2 px-3 py-1 ide-h-hover cursor-pointer"
                            onClick={() => {
                              if (p.fullPath) {
                                const fp = p.fullPath.replace(/^\//, '');
                                handleSelectFile(fp);
                              }
                            }}>
                            {p.severity >= 8
                              ? <FiAlertCircle size={13} className="shrink-0 mt-0.5 text-[#f48771]" />
                              : <FiAlertTriangle size={13} className="shrink-0 mt-0.5 text-[#cca700]" />
                            }
                            <div className="flex-1 min-w-0">
                              <span className="ide-text-bright">{p.message}</span>
                              <span className="ml-2 ide-text-muted">
                                {p.file}:{p.line}:{p.col}
                                {p.source ? ` (${p.source})` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>{/* end editor area */}
        </div>{/* end workbench */}
      </div>{/* end main row */}

      {/* ── Status Bar ──────────────────────────────────────────────── */}
      {settings.statusBar !== false && (
        <div className="flex items-center justify-between h-5.5 shrink-0 ide-accent-bg text-white text-[11px] px-2 overflow-hidden">
          <div className="flex items-center gap-0">
            <button className="flex items-center gap-1 px-2 h-full hover:bg-[#ffffff22] transition-colors"
              onClick={() => switchActivity('git')} title="Source Control">
              <FiGitBranch size={11} /> {gitBranch || 'no git'}
            </button>
            {gitChanges.length > 0 && (
              <span className="flex items-center gap-1 px-2 hover:bg-[#ffffff22]">
                <FiAlertCircle size={10} /> {gitChanges.length} change{gitChanges.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-0">
            {/* Error / Warning count → clicking opens Problems panel */}
            {problems.length > 0 && (
              <button className="flex items-center gap-1 px-2 h-full hover:bg-[#ffffff22] transition-colors"
                onClick={() => toggleBottom('problems')} title="Problems">
                {problems.filter(p => p.severity >= 8).length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <FiAlertCircle size={11} />
                    {problems.filter(p => p.severity >= 8).length}
                  </span>
                )}
                {problems.filter(p => p.severity === 4).length > 0 && (
                  <span className="flex items-center gap-0.5 ml-1">
                    <FiAlertTriangle size={11} />
                    {problems.filter(p => p.severity === 4).length}
                  </span>
                )}
              </button>
            )}
            <button className="flex items-center gap-1 px-2 h-full hover:bg-[#ffffff22] transition-colors"
              onClick={() => toggleBottom('terminal')} title="Toggle Terminal">
              <VscTerminal size={11} />
            </button>
            {currentFile && (
              <>
                <span className="px-2 hover:bg-[#ffffff22] cursor-default">Ln {cursorPos.line}, Col {cursorPos.col}</span>
                <span className="px-2 hover:bg-[#ffffff22] cursor-default">{api.getDisplayLanguage(currentFile)}</span>
              </>
            )}
            <span className="px-2 hover:bg-[#ffffff22] cursor-default">UTF-8</span>
            <span className="px-2 hover:bg-[#ffffff22] cursor-default">Spaces: {settings.tabSize || 2}</span>
          </div>
        </div>
      )}

      {/* ── Overlays ── */}
      <SearchPanel isOpen={isFileSearchOpen} onClose={() => setIsFileSearchOpen(false)} files={allFiles} onSelectFile={handleSelectFile} />
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} commands={commands} />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onSettingsChange={setSettings} />
      <OpenProjectPanel isOpen={isProjectPanelOpen} onClose={() => setIsProjectPanelOpen(false)} onProjectOpened={() => {}} />
      <AIPanel 
        isOpen={isAIPanelOpen} 
        onClose={() => setIsAIPanelOpen(false)}
        currentFile={currentFile}
        editorContent={currentFile ? (openFiles[currentFile]?.content || projectFiles[currentFile]?.content || '') : ''}
        editorPosition={cursorPos}
      />
    </div>
  );
}
