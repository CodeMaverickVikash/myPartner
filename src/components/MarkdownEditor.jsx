import { useRef } from 'react'
import {
  IoText,
  IoCode,
  IoList,
  IoLink,
  IoImage
} from 'react-icons/io5'
import { parseMarkdown } from '../utils/markdown'

function MarkdownEditor({ content, onChange }) {
  const textareaRef = useRef(null)
  const previewRef = useRef(null)

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
  }

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
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
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

        {/* Preview */}
        <div className="flex-1 flex flex-col">
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

