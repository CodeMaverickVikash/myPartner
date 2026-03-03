import { useRef, useEffect, useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { useWorkspaceStore } from '../../utils/workspaceStore'
import { lspManager } from '../../utils/lspManager'
import toast from 'react-hot-toast'
import { IoSave, IoAdd, IoClose, IoSettings, IoCheckmark } from 'react-icons/io5'
import './CodeEditor.css'

export default function CodeEditor() {
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const [lspConnected, setLspConnected] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const {
    openTabs,
    currentTabId,
    tabContent,
    tabMetadata,
    projectSettings,
    diagnostics,
    addTab,
    removeTab,
    setCurrentTab,
    updateTabContent,
    saveTab,
    updateProjectSetting,
    setDiagnostics
  } = useWorkspaceStore()

  // Initialize LSP on mount
  useEffect(() => {
    let cancelled = false
    const initLSP = async () => {
      try {
        if (projectSettings.enableLSP) {
          await lspManager.connect()
          if (!cancelled) {
            setLspConnected(true)
            // Listen for diagnostics
            lspManager.on('textDocument/publishDiagnostics', (params) => {
              setDiagnostics(params.uri, params.diagnostics)
            })
            toast.success('Language Server connected', { duration: 2000 })
          }
        }
      } catch (error) {
        console.error('LSP connection failed:', error)
        toast.error('Could not connect to Language Server', { duration: 3000 })
      }
    }

    initLSP()

    return () => {
      cancelled = true
      if (lspConnected) {
        lspManager.disconnect()
      }
    }
  }, [projectSettings.enableLSP, setDiagnostics])
  // Handle editor mount
  const handleBeforeMount = (monaco) => {
    monacoRef.current = monaco

    // Define custom theme
    monaco.editor.defineTheme('dev-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'type', foreground: '4EC9B0' }
      ],
      colors: {
        'editor.background': '#0f172a',
        'editor.foreground': '#D4D4D4',
        'editor.lineNumbersBackground': '#1e293b',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#AEAFAD',
        'editorWhitespace.foreground': '#464647'
      }
    })
  }

  const handleEditorMount = async (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Setup keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave()
    })

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        handleFormat()
      }
    )

    // Setup LSP providers if connected
    if (lspConnected && currentTabId && tabMetadata[currentTabId]) {
      setupLSPProviders(monaco, editor)
    }
  }

  const setupLSPProviders = (monaco, editor) => {
    const language = tabMetadata[currentTabId]?.language

    if (!language) return

    // Completion provider
    monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems: async (model, position) => {
        try {
          const completions = await lspManager.getCompletion(
            `file:///${currentTabId}`,
            position.lineNumber - 1,
            position.column - 1
          )

          if (!completions?.items) return { suggestions: [] }

          return {
            suggestions: completions.items.map(item => ({
              label: item.label,
              kind: monaco.languages.CompletionItemKind[getCompletionKind(item.kind)] || 1,
              insertText: item.insertText || item.label,
              documentation: item.documentation || '',
              sortText: item.sortText || item.label,
              filterText: item.filterText || item.label
            }))
          }
        } catch (error) {
          console.error('Completion error:', error)
          return { suggestions: [] }
        }
      }
    })

    // Hover provider
    monaco.languages.registerHoverProvider(language, {
      provideHover: async (model, position) => {
        try {
          const hover = await lspManager.getHover(
            `file:///${currentTabId}`,
            position.lineNumber - 1,
            position.column - 1
          )

          if (!hover) return null

          return {
            contents: [
              { value: typeof hover.contents === 'string' ? hover.contents : hover.contents.value || '' }
            ]
          }
        } catch (error) {
          console.error('Hover error:', error)
          return null
        }
      }
    })

    // Definition provider
    monaco.languages.registerDefinitionProvider(language, {
      provideDefinition: async (model, position) => {
        try {
          return await lspManager.getDefinition(
            `file:///${currentTabId}`,
            position.lineNumber - 1,
            position.column - 1
          )
        } catch (error) {
          console.error('Definition error:', error)
          return null
        }
      }
    })

    // References provider
    monaco.languages.registerReferenceProvider(language, {
      provideReferences: async (model, position, context) => {
        try {
          return await lspManager.getReferences(
            `file:///${currentTabId}`,
            position.lineNumber - 1,
            position.column - 1,
            context.includeDeclaration
          )
        } catch (error) {
          console.error('References error:', error)
          return []
        }
      }
    })
  }

  // Handle file save
  const handleSave = useCallback(async () => {
    if (!currentTabId) return

    try {
      const uri = `file:///${currentTabId}`

      // Notify LSP
      if (lspConnected) {
        await lspManager.didSave(uri)
      }

      // Format if enabled
      if (projectSettings.formatOnSave && lspConnected) {
        const formatted = await lspManager.formatDocument(uri, {
          tabSize: projectSettings.tabSize,
          insertSpaces: projectSettings.insertSpaces
        })

        if (formatted && formatted.length > 0) {
          const newText = formatted[0].newText
          updateTabContent(currentTabId, newText)
          if (editorRef.current) {
            editorRef.current.setValue(newText)
          }
        }
      }

      saveTab(currentTabId)
      toast.success('File saved', { duration: 2000, icon: <IoCheckmark /> })
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save file')
    }
  }, [currentTabId, projectSettings, updateTabContent, saveTab, lspConnected])

  // Handle format
  const handleFormat = useCallback(async () => {
    if (!currentTabId || !lspConnected) {
      toast.error('LSP not connected')
      return
    }

    try {
      const uri = `file:///${currentTabId}`
      const formatted = await lspManager.formatDocument(uri, {
        tabSize: projectSettings.tabSize,
        insertSpaces: projectSettings.insertSpaces
      })

      if (formatted && formatted.length > 0) {
        const newText = formatted[0].newText
        updateTabContent(currentTabId, newText)
        if (editorRef.current) {
          editorRef.current.setValue(newText)
        }
        toast.success('Code formatted', { duration: 2000 })
      }
    } catch (error) {
      console.error('Format error:', error)
      toast.error('Failed to format code')
    }
  }, [currentTabId, projectSettings, updateTabContent, lspConnected])

  const currentFile = currentTabId ? tabMetadata[currentTabId] : null
  const currentContent = currentTabId ? tabContent[currentTabId] : ''

  return (
    <div className="code-editor-container">
      {/* Header */}
      <div className="code-editor-header">
        <div className="header-left">
          <span className={`lsp-status ${lspConnected ? 'connected' : 'disconnected'}`}>
            {lspConnected ? '● LSP Connected' : '○ LSP Disconnected'}
          </span>
        </div>
        <div className="header-right">
          <button
            onClick={handleFormat}
            className="header-btn"
            title="Format Code (Ctrl+Shift+F)"
            disabled={!lspConnected}
          >
            ✨ Format
          </button>
          <button
            onClick={handleSave}
            className="header-btn"
            title="Save (Ctrl+S)"
          >
            <IoSave /> Save
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="header-btn"
            title="Settings"
          >
            <IoSettings />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {openTabs.map(tabId => {
          const metadata = tabMetadata[tabId]
          const isDirty = metadata?.isDirty

          return (
            <div
              key={tabId}
              onClick={() => setCurrentTab(tabId)}
              className={`tab ${currentTabId === tabId ? 'active' : ''}`}
            >
              <span className="tab-name">{metadata?.name || 'Untitled'}</span>
              {isDirty && <span className="dirty-indicator">●</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeTab(tabId)
                }}
                className="tab-close"
              >
                <IoClose />
              </button>
            </div>
          )
        })}
        <button className="tab-add">
          <IoAdd />
        </button>
      </div>

      {/* Editor */}
      <div className="editor-wrapper">
        {currentFile ? (
          <Editor
            height="100%"
            language={currentFile.language || 'javascript'}
            theme="dev-theme"
            value={currentContent}
            beforeMount={handleBeforeMount}
            onMount={handleEditorMount}
            onChange={(value) => updateTabContent(currentTabId, value || '')}
            options={{
              fontSize: projectSettings.fontSize,
              tabSize: projectSettings.tabSize,
              insertSpaces: projectSettings.insertSpaces,
              wordWrap: projectSettings.wordWrap,
              formatOnPaste: projectSettings.formatOnPaste,
              showLineNumbers: projectSettings.showLineNumbers,
              minimap: { enabled: false },
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: {
                other: true,
                comments: false,
                strings: false
              }
            }}
          />
        ) : (
          <div className="empty-state">
            <p>No file open</p>
            <button className="btn-primary">+ Create New File</button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          {currentFile && (
            <>
              <span>Ln 1, Col 1</span>
              <span>●</span>
              <span>{currentFile.language || 'text'}</span>
            </>
          )}
        </div>
        <div className="status-right">
          {lspConnected && <span className="lsp-badge">LSP ✓</span>}
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={projectSettings}
          onSettingsChange={updateProjectSetting}
        />
      )}
    </div>
  )
}

function SettingsModal({ isOpen, onClose, settings, onSettingsChange }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Editor Settings</h2>

        <div className="setting-group">
          <label>Font Size</label>
          <input
            type="range"
            min="10"
            max="24"
            value={settings.fontSize}
            onChange={(e) => onSettingsChange('fontSize', parseInt(e.target.value))}
          />
          <span>{settings.fontSize}px</span>
        </div>

        <div className="setting-group">
          <label>Tab Size</label>
          <select
            value={settings.tabSize}
            onChange={(e) => onSettingsChange('tabSize', parseInt(e.target.value))}
          >
            <option value="2">2</option>
            <option value="4">4</option>
            <option value="8">8</option>
          </select>
        </div>

        <div className="setting-group checkbox">
          <input
            type="checkbox"
            id="formatOnSave"
            checked={settings.formatOnSave}
            onChange={(e) => onSettingsChange('formatOnSave', e.target.checked)}
          />
          <label htmlFor="formatOnSave">Format on Save</label>
        </div>

        <div className="setting-group checkbox">
          <input
            type="checkbox"
            id="formatOnPaste"
            checked={settings.formatOnPaste}
            onChange={(e) => onSettingsChange('formatOnPaste', e.target.checked)}
          />
          <label htmlFor="formatOnPaste">Format on Paste</label>
        </div>

        <div className="setting-group checkbox">
          <input
            type="checkbox"
            id="enableLSP"
            checked={settings.enableLSP}
            onChange={(e) => onSettingsChange('enableLSP', e.target.checked)}
          />
          <label htmlFor="enableLSP">Enable Language Server</label>
        </div>

        <button onClick={onClose} className="btn-primary">Close</button>
      </div>
    </div>
  )
}

function getCompletionKind(kind) {
  const kinds = {
    1: 'Text',
    2: 'Method',
    3: 'Function',
    4: 'Constructor',
    5: 'Field',
    6: 'Variable',
    7: 'Class',
    8: 'Interface',
    9: 'Module',
    10: 'Property'
  }
  return kinds[kind] || 'Text'
}
