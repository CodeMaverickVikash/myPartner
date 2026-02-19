import { useRef, useState, useEffect } from 'react'
import {
  IoText,
  IoCode,
  IoList,
  IoLink,
  IoImage,
  IoArrowUndo,
  IoArrowRedo
} from 'react-icons/io5'
import { parseMarkdown } from '../utils/markdown'

function MarkdownEditor({ content, onChange, initialScrollPosition = 0, onScrollChange }) {
  const textareaRef = useRef(null)
  const previewRef = useRef(null)
  const containerRef = useRef(null)
  const [editorWidth, setEditorWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const scrollRestored = useRef(false)
  
  // Undo/Redo history
  const [history, setHistory] = useState([content])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoAction = useRef(false)

  // Update history when content changes (but not during undo/redo)
  useEffect(() => {
    if (!isUndoRedoAction.current && content !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(content)
      // Limit history to 50 entries
      if (newHistory.length > 50) {
        newHistory.shift()
      } else {
        setHistoryIndex(historyIndex + 1)
      }
      setHistory(newHistory)
    }
    isUndoRedoAction.current = false
  }, [content, history, historyIndex])

  // Restore scroll position when component mounts
  useEffect(() => {
    if (textareaRef.current && initialScrollPosition > 0 && !scrollRestored.current) {
      textareaRef.current.scrollTop = initialScrollPosition
      scrollRestored.current = true
    }
  }, [initialScrollPosition])

  const insertMarkdown = (before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return

    // Save current scroll position
    const currentScrollTop = textarea.scrollTop

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)
    const textToInsert = (selectedText || placeholder).trim();

    const newText =
      textarea.value.substring(0, start) +
      before + textToInsert + after +
      textarea.value.substring(end)

    onChange(newText)

    // Set cursor position after insertion and restore scroll position
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      // Restore scroll position
      textarea.scrollTop = currentScrollTop
    }, 0)
  }

  // Synchronized scrolling
  const handleEditorScroll = () => {
    if (!textareaRef.current || !previewRef.current) return

    const textarea = textareaRef.current
    const preview = previewRef.current

    const scrollPercentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight)
    preview.scrollTop = scrollPercentage * (preview.scrollHeight - preview.clientHeight)

    // Save scroll position
    if (onScrollChange) {
      onScrollChange(textarea.scrollTop)
    }
  }

  // Resize handlers
  const handleMouseDown = () => {
    setIsResizing(true)
  }

  const handleMouseMove = (e) => {
    if (!containerRef.current) return

    const container = containerRef.current
    const containerRect = container.getBoundingClientRect()
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

    // Limit between 20% and 80%
    if (newWidth >= 20 && newWidth <= 80) {
      setEditorWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  // Add/remove mouse event listeners using useEffect
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true
      const currentScrollTop = textareaRef.current?.scrollTop || 0
      const currentSelectionStart = textareaRef.current?.selectionStart || 0
      const currentSelectionEnd = textareaRef.current?.selectionEnd || 0
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.scrollTop = currentScrollTop
          // Try to restore selection if still valid
          const maxLength = textareaRef.current.value.length
          const safeStart = Math.min(currentSelectionStart, maxLength)
          const safeEnd = Math.min(currentSelectionEnd, maxLength)
          textareaRef.current.setSelectionRange(safeStart, safeEnd)
        }
      }, 10)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true
      const currentScrollTop = textareaRef.current?.scrollTop || 0
      const currentSelectionStart = textareaRef.current?.selectionStart || 0
      const currentSelectionEnd = textareaRef.current?.selectionEnd || 0
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.scrollTop = currentScrollTop
          // Try to restore selection if still valid
          const maxLength = textareaRef.current.value.length
          const safeStart = Math.min(currentSelectionStart, maxLength)
          const safeEnd = Math.min(currentSelectionEnd, maxLength)
          textareaRef.current.setSelectionRange(safeStart, safeEnd)
        }
      }, 10)
    }
  }

  const toolbarButtons = [
    { icon: IoArrowUndo, label: 'Undo (Ctrl+Z)', action: handleUndo, disabled: historyIndex <= 0 },
    { icon: IoArrowRedo, label: 'Redo (Ctrl+Y)', action: handleRedo, disabled: historyIndex >= history.length - 1 },
    { icon: IoText, label: 'Bold', action: () => insertMarkdown('**', '**', 'bold text') },
    { icon: IoText, label: 'Italic', action: () => insertMarkdown('*', '*', 'italic text') },
    { icon: IoText, label: 'Heading', action: () => insertMarkdown('## ', '', 'Heading') },
    { icon: IoCode, label: 'Code', action: () => insertMarkdown('`', '`', 'code') },
    { icon: IoList, label: 'Unordered List', action: () => insertMarkdown('- ', '', 'list item') },
    { icon: IoList, label: 'Ordered List', action: () => insertMarkdown('1. ', '', 'list item') },
    { icon: IoLink, label: 'Link', action: () => insertMarkdown('[', '](url)', 'link text') },
    { icon: IoImage, label: 'Image', action: () => insertMarkdown('![', '](url)', 'alt text') },
  ]

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
        {toolbarButtons.map((button, index) => (
          <button
            key={index}
            onClick={button.action}
            disabled={button.disabled}
            className={`p-2 rounded transition-colors duration-150 ${
              button.disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-gray-200'
            }`}
            title={button.label}
            type="button"
          >
            <button.icon className="w-4 h-4 text-gray-700" />
          </button>
        ))}
      </div>

      {/* Split View: Editor + Preview */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        {/* Editor */}
        <div
          className="flex flex-col border-r border-gray-200"
          style={{ width: `${editorWidth}%` }}
        >
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
            EDIT
          </div>
          <textarea
            ref={textareaRef}
            className="flex-1 p-6 bg-white text-gray-800 border-none font-mono text-[0.95rem] leading-relaxed resize-none outline-none overflow-y-auto"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleEditorScroll}
            onKeyDown={(e) => {
              // Ctrl+Z for Undo
              if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                handleUndo()
              }
              // Ctrl+Y or Ctrl+Shift+Z for Redo
              if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault()
                handleRedo()
              }
            }}
            placeholder="Write your markdown here..."
            spellCheck="false"
          />
        </div>

        {/* Resizer */}
        <div
          className="w-1 bg-gray-200 hover:bg-indigo-400 cursor-col-resize shrink-0 transition-colors duration-150 relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
            PREVIEW
          </div>
          <div
            ref={previewRef}
            className="flex-1 p-6 bg-white overflow-y-auto markdown-content"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
          />
        </div>
      </div>
    </div>
  )
}

export default MarkdownEditor

