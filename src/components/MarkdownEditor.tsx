import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import type { IconType } from 'react-icons'
import {
  IoText,
  IoCode,
  IoList,
  IoLink,
  IoImage,
  IoArrowUndo,
  IoArrowRedo,
  IoEllipsisVertical,
  IoCheckboxOutline,
  IoRemoveOutline,
  IoGridOutline,
  IoChatboxOutline,
  IoTerminalOutline,
  IoChevronDown
} from 'react-icons/io5'
import { parseMarkdown } from '../utils/markdown'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  initialScrollPosition?: number
  onScrollChange?: (scrollTop: number) => void
}

interface ToolbarButton {
  icon: IconType
  label: string
  action: () => void
  disabled?: boolean
}

function MarkdownEditor({ content, onChange, initialScrollPosition = 0, onScrollChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [editorWidth, setEditorWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  const scrollRestored = useRef(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [history, setHistory] = useState<string[]>([content])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoAction = useRef(false)

  useEffect(() => {
    if (!isUndoRedoAction.current && content !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(content)

      if (newHistory.length > 50) {
        newHistory.shift()
      } else {
        setHistoryIndex(historyIndex + 1)
      }
      setHistory(newHistory)
    }
    isUndoRedoAction.current = false
  }, [content, history, historyIndex])

  useEffect(() => {
    if (textareaRef.current && initialScrollPosition > 0 && !scrollRestored.current) {
      textareaRef.current.scrollTop = initialScrollPosition
      scrollRestored.current = true
    }
  }, [initialScrollPosition])

  const insertMarkdown = (before: string, after = '', placeholder = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const currentScrollTop = textarea.scrollTop
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newText =
      content.substring(0, start) +
      before + textToInsert + after +
      content.substring(end)

    const newCursorPos = start + before.length + textToInsert.length

    onChange(newText)

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        textareaRef.current.scrollTop = currentScrollTop
      }
    }, 10)
  }

  const insertTable = () => {
    const tableTemplate = `| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`
    insertMarkdown('', '', tableTemplate)
  }

  const insertTaskList = () => insertMarkdown('- [ ] ', '', 'Task item')
  const insertBlockquote = () => insertMarkdown('> ', '', 'Quote text')
  const insertCodeBlock = (language = '') => insertMarkdown(`\`\`\`${language}\n`, '\n\`\`\`', 'code here')
  const insertHorizontalRule = () => insertMarkdown('\n---\n', '', '')
  const insertStrikethrough = () => insertMarkdown('~~', '~~', 'strikethrough text')
  const insertFootnote = () => insertMarkdown('[^1]', '', '')
  const insertCollapsible = () => {
    const template = `<details>
<summary>Click to expand</summary>

Content goes here

</details>`
    insertMarkdown('', '', template)
  }

  const handleEditorScroll = () => {
    if (!textareaRef.current || !previewRef.current) return

    const textarea = textareaRef.current
    const preview = previewRef.current
    const maxEditorScroll = textarea.scrollHeight - textarea.clientHeight
    const maxPreviewScroll = preview.scrollHeight - preview.clientHeight
    const scrollPercentage = maxEditorScroll > 0 ? textarea.scrollTop / maxEditorScroll : 0

    preview.scrollTop = scrollPercentage * maxPreviewScroll
    onScrollChange?.(textarea.scrollTop)
  }

  const handleMouseDown = () => {
    setIsResizing(true)
  }

  const handleMouseMove = (event: MouseEvent) => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = ((event.clientX - containerRect.left) / containerRect.width) * 100

    if (newWidth >= 20 && newWidth <= 80) {
      setEditorWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleUndo = () => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true
      const currentScrollTop = textareaRef.current?.scrollTop ?? 0
      const currentSelectionStart = textareaRef.current?.selectionStart ?? 0
      const currentSelectionEnd = textareaRef.current?.selectionEnd ?? 0
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.scrollTop = currentScrollTop
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
      const currentScrollTop = textareaRef.current?.scrollTop ?? 0
      const currentSelectionStart = textareaRef.current?.selectionStart ?? 0
      const currentSelectionEnd = textareaRef.current?.selectionEnd ?? 0
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      onChange(history[newIndex])
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.scrollTop = currentScrollTop
          const maxLength = textareaRef.current.value.length
          const safeStart = Math.min(currentSelectionStart, maxLength)
          const safeEnd = Math.min(currentSelectionEnd, maxLength)
          textareaRef.current.setSelectionRange(safeStart, safeEnd)
        }
      }, 10)
    }
  }

  const toolbarButtons: ToolbarButton[] = [
    { icon: IoArrowUndo, label: 'Undo (Ctrl+Z)', action: handleUndo, disabled: historyIndex <= 0 },
    { icon: IoArrowRedo, label: 'Redo (Ctrl+Y)', action: handleRedo, disabled: historyIndex >= history.length - 1 },
    { icon: IoText, label: 'Bold', action: () => insertMarkdown('**', '**', 'bold text') },
    { icon: IoText, label: 'Italic', action: () => insertMarkdown('*', '*', 'italic text') },
    { icon: IoText, label: 'Heading', action: () => insertMarkdown('## ', '', 'Heading') },
    { icon: IoCode, label: 'Code', action: () => insertMarkdown('`', '`', 'code') },
    { icon: IoList, label: 'Unordered List', action: () => insertMarkdown('- ', '', 'list item') },
    { icon: IoList, label: 'Ordered List', action: () => insertMarkdown('1. ', '', 'list item') },
    { icon: IoLink, label: 'Link', action: () => insertMarkdown('[', '](url)', 'link text') },
    { icon: IoImage, label: 'Image', action: () => insertMarkdown('![', '](url)', 'alt text') }
  ]

  const menuItems: ToolbarButton[] = [
    { icon: IoGridOutline, label: 'Table', action: insertTable },
    { icon: IoCheckboxOutline, label: 'Task List', action: insertTaskList },
    { icon: IoChatboxOutline, label: 'Blockquote', action: insertBlockquote },
    { icon: IoTerminalOutline, label: 'Code Block', action: () => insertCodeBlock('') },
    { icon: IoRemoveOutline, label: 'Horizontal Rule', action: insertHorizontalRule },
    { icon: IoText, label: 'Strikethrough', action: insertStrikethrough },
    { icon: IoText, label: 'Footnote', action: insertFootnote },
    { icon: IoChevronDown, label: 'Collapsible Section', action: insertCollapsible }
  ]

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex items-center px-4 py-2 border-b border-sage/30 bg-gradient-to-r from-cream/30 to-white shrink-0">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((button, index) => (
            <button
              key={index}
              onClick={button.action}
              disabled={button.disabled}
              className={`p-2 rounded transition-colors duration-150 ${
                button.disabled
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-sage/30'
              }`}
              title={button.label}
              type="button"
            >
              <button.icon className="w-4 h-4 text-forest" />
            </button>
          ))}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-sage/30 rounded transition-colors duration-150"
            title="More formatting options"
            type="button"
          >
            <IoEllipsisVertical className="w-4 h-4 text-forest" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-sage rounded-lg shadow-lg z-50 py-1">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    item.action()
                    setIsMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-sage/20 flex items-center gap-3 transition-colors duration-150"
                  type="button"
                >
                  <item.icon className="w-4 h-4 text-forest" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        <div
          className="flex flex-col border-r border-sage/30"
          style={{ width: `${editorWidth}%` }}
        >
          <div className="px-4 py-2 bg-cream/40 border-b border-sage/30 text-xs font-medium text-forest">
            EDIT
          </div>
          <textarea
            ref={textareaRef}
            className="flex-1 p-6 bg-white text-gray-800 border-none font-mono text-[0.95rem] leading-relaxed resize-none outline-none overflow-y-auto"
            value={content}
            onChange={(event) => onChange(event.target.value)}
            onScroll={handleEditorScroll}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
                event.preventDefault()
                handleUndo()
              }
              if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) {
                event.preventDefault()
                handleRedo()
              }
            }}
            placeholder="Write your markdown here..."
            spellCheck="false"
          />
        </div>

        <div
          className="w-1 bg-sage/40 hover:bg-forest cursor-col-resize shrink-0 transition-colors duration-150 relative group"
          onMouseDown={handleMouseDown as (event: ReactMouseEvent<HTMLDivElement>) => void}
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-cream/40 border-b border-sage/30 text-xs font-medium text-forest">
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
