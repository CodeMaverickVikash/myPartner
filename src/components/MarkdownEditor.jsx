import { useRef, useState, useEffect } from 'react'
import {
  IoText,
  IoCode,
  IoList,
  IoLink,
  IoImage
} from 'react-icons/io5'
import { parseMarkdown } from '../utils/markdown'

function MarkdownEditor({ content, onChange, initialScrollPosition = 0, onScrollChange }) {
  const textareaRef = useRef(null)
  const previewRef = useRef(null)
  const containerRef = useRef(null)
  const [editorWidth, setEditorWidth] = useState(50) // percentage
  const [isResizing, setIsResizing] = useState(false)
  const scrollRestored = useRef(false)

  // Restore scroll position when component mounts or content changes
  useEffect(() => {
    if (textareaRef.current && initialScrollPosition > 0 && !scrollRestored.current) {
      textareaRef.current.scrollTop = initialScrollPosition
      scrollRestored.current = true
    }
  }, [initialScrollPosition])

  // Reset scroll restored flag when content changes significantly
  useEffect(() => {
    scrollRestored.current = false
  }, [content])

  const insertMarkdown = (before, after = '', placeholder = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newText =
      content.substring(0, start) +
      before + textToInsert + after +
      content.substring(end)

    onChange(newText)

    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length
      textarea.focus()
      textarea.setSelectionRange(newCursorPos, newCursorPos)
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

  const toolbarButtons = [
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
            className="p-2 hover:bg-gray-200 rounded transition-colors duration-150"
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

