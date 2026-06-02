import { useEffect, useRef, useState } from 'react'
import { Menu, ChevronUp, FileText, Link, FolderOpen, Maximize2, Minimize2, Save, Copy, Check } from 'lucide-react'
import MarkdownViewer from './MarkdownViewer'
import type { MarkdownFile } from '../types'

interface ContentProps {
  file: MarkdownFile | null
  fileHandle?: FileSystemFileHandle | null
  onFileUpdate: (fileId: string, content: string) => void
  onSaveToSystem: (fileId: string, content?: string) => Promise<void>
  onToggleSidebar: () => void
  sidebarVisible: boolean
  onDirtyChange?: (isDirty: boolean) => void
}

function Content({ file, onFileUpdate, onSaveToSystem, onToggleSidebar, sidebarVisible, onDirtyChange }: ContentProps) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [copied, setCopied] = useState(false)
  const mainRef = useRef<HTMLElement | null>(null)
  const markdownViewerRef = useRef<HTMLDivElement | null>(null)
  const latestContentRef = useRef('')
  const saveRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Sync ref when external content arrives (file watcher, initial load)
  useEffect(() => {
    latestContentRef.current = file?.content ?? ''
  }, [file?.content])

  // Reset dirty state when switching files
  useEffect(() => {
    setIsDirty(false)
  }, [file?.id])

  // Notify parent of dirty state
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Ctrl+S save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        saveRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mainRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const scrollToTop = () => {
    markdownViewerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // No longer auto-saves — just tracks the latest content and marks dirty
  const handleInlineChange = (content: string) => {
    if (!file) return
    latestContentRef.current = content
    setScrollPosition(markdownViewerRef.current?.scrollTop ?? 0)
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!file || !isDirty) return
    const content = latestContentRef.current
    if (file.isSystemFile) {
      await onSaveToSystem(file.id, content)
    } else {
      onFileUpdate(file.id, content)
    }
    setIsDirty(false)
    setTimeout(() => {
      if (markdownViewerRef.current) markdownViewerRef.current.scrollTop = scrollPosition
    }, 0)
  }
  saveRef.current = handleSave

  const handleCopyMarkdown = async () => {
    if (!file) return
    await navigator.clipboard.writeText(latestContentRef.current)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main ref={mainRef} className="flex-1 flex flex-col bg-surface-1 overflow-hidden relative">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center px-3 py-1.5 bg-surface-2 border-b border-line gap-2 flex-wrap shrink-0">
        <button
          className="flex items-center justify-center cursor-pointer text-ink-2 transition-all duration-200 p-1.5 w-8 h-8 rounded-md hover:bg-surface-1 hover:text-forest active:scale-95 border border-line shrink-0"
          onClick={onToggleSidebar}
          title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <Menu className="w-4 h-4" />
        </button>

        {file && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-4 h-4 text-ink-3 shrink-0" />
            <div className="flex flex-col gap-0 flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-ink-1 truncate">{file.name}</span>
                {isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
                )}
                {file.isSystemFile && !isDirty && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-forest/15 text-forest text-xs font-medium rounded shrink-0" title="Linked to system file — changes save directly">
                    <Link className="w-3 h-3" />
                    Synced
                  </span>
                )}
              </div>
              {file.filePath && (
                <div className="flex items-center gap-1 text-xs text-ink-3">
                  <FolderOpen className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-xs" title={file.filePath}>{file.filePath}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {file && (
          <button
            onClick={handleSave}
            disabled={!isDirty}
            title={isDirty ? 'Save changes (Ctrl+S)' : 'No unsaved changes'}
            className={`flex items-center justify-center p-1.5 w-8 h-8 rounded-md border transition-all duration-200 shrink-0 ${
              isDirty
                ? 'cursor-pointer text-forest border-forest/40 hover:bg-forest/10 active:scale-95'
                : 'cursor-default text-ink-3 border-line opacity-40'
            }`}
          >
            <Save className="w-4 h-4" />
          </button>
        )}

        {file && (
          <button
            onClick={handleCopyMarkdown}
            title="Copy markdown source"
            className="flex items-center justify-center p-1.5 w-8 h-8 rounded-md border border-line transition-all duration-200 shrink-0 cursor-pointer text-ink-2 hover:bg-surface-1 hover:text-forest active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-forest" /> : <Copy className="w-4 h-4" />}
          </button>
        )}

        <button
          className="flex items-center justify-center cursor-pointer text-ink-2 transition-all duration-200 p-1.5 w-8 h-8 rounded-md hover:bg-surface-1 hover:text-forest active:scale-95 border border-line shrink-0"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {file ? (
        <>
          <MarkdownViewer
            content={file.content}
            markdownViewerRef={markdownViewerRef}
            onContentChange={handleInlineChange}
          />

          <button
            className="fixed bottom-6 right-6 w-9 h-9 bg-surface-2 text-ink-2 border border-line rounded-lg cursor-pointer flex items-center justify-center shadow-sm transition-all duration-200 z-50 hover:bg-forest hover:text-white hover:border-forest active:scale-95"
            onClick={scrollToTop}
            title="Scroll to top"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
          <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-ink-3" />
          </div>
          <p className="text-sm font-medium text-ink-2">No file open</p>
          <p className="text-xs text-ink-3">Click <strong className="text-ink-2">Open File</strong> in the sidebar to begin</p>
        </div>
      )}
    </main>
  )
}

export default Content
