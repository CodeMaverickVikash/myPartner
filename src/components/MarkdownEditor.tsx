import { useEffect, useRef, useState } from 'react'
import {
  Undo2,
  Redo2,
  Code,
  Image,
  Link,
  List,
  ListOrdered,
  Ellipsis,
  SquareCheck,
  Minus,
  Table2,
  Quote,
  Code2,
  ChevronDown,
  Strikethrough,
  type LucideIcon
} from 'lucide-react'

interface MarkdownEditorProps {
  content: string
  onChange: (content: string) => void
  initialScrollPosition?: number
  onScrollChange?: (scrollTop: number) => void
  initialCursorPosition?: number
}

interface ToolbarItem {
  type: 'icon' | 'text'
  icon?: LucideIcon
  text?: string
  textClass?: string
  label: string
  action: () => void
  disabled?: boolean
}

function getCaretOffset(element: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return 0
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(element)
  pre.setEnd(range.endContainer, range.endOffset)
  return pre.toString().length
}

function getSelectionOffsets(element: HTMLElement): [number, number] {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return [0, 0]
  const range = sel.getRangeAt(0)

  const startRange = range.cloneRange()
  startRange.selectNodeContents(element)
  startRange.setEnd(range.startContainer, range.startOffset)
  const start = startRange.toString().length

  const endRange = range.cloneRange()
  endRange.selectNodeContents(element)
  endRange.setEnd(range.endContainer, range.endOffset)
  const end = endRange.toString().length

  return [start, end]
}

function setCaretOffset(element: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node = walker.nextNode() as Text | null
  while (node) {
    const len = node.length
    if (remaining <= len) {
      const range = document.createRange()
      range.setStart(node, remaining)
      range.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      return
    }
    remaining -= len
    node = walker.nextNode() as Text | null
  }
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  window.getSelection()?.removeAllRanges()
  window.getSelection()?.addRange(range)
}

function MarkdownEditor({ content, onChange, initialScrollPosition = 0, onScrollChange, initialCursorPosition = 0 }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const scrollRestored = useRef(false)
  const internalContent = useRef('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [history, setHistory] = useState<string[]>([content])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoAction = useRef(false)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (internalContent.current === content) return

    internalContent.current = content
    const offset = getCaretOffset(editor)
    editor.textContent = content
    setCaretOffset(editor, Math.min(offset, content.length))
  }, [content])

  useEffect(() => {
    if (editorRef.current && initialScrollPosition > 0 && !scrollRestored.current) {
      editorRef.current.scrollTop = initialScrollPosition
      scrollRestored.current = true
    }
  }, [initialScrollPosition])

  useEffect(() => {
    setTimeout(() => {
      const ed = editorRef.current
      if (!ed) return
      ed.focus()
      setCaretOffset(ed, Math.min(initialCursorPosition, ed.textContent?.length ?? 0))
    }, 20)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const handleInput = () => {
    const editor = editorRef.current
    if (!editor) return
    const text = editor.innerText
    internalContent.current = text
    onChange(text)
  }

  const insertMarkdown = (before: string, after = '', placeholder = '') => {
    const editor = editorRef.current
    if (!editor) return

    const currentScrollTop = editor.scrollTop
    const [start, end] = getSelectionOffsets(editor)
    const selectedText = content.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newText =
      content.substring(0, start) +
      before + textToInsert + after +
      content.substring(end)

    const newCursorPos = start + before.length + textToInsert.length

    internalContent.current = newText
    onChange(newText)

    setTimeout(() => {
      const ed = editorRef.current
      if (!ed) return
      ed.focus()
      ed.textContent = newText
      setCaretOffset(ed, newCursorPos)
      ed.scrollTop = currentScrollTop
    }, 0)
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
  const insertCodeBlock = () => insertMarkdown('```\n', '\n```', 'code here')
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
    if (historyIndex <= 0) return
    isUndoRedoAction.current = true
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    const restored = history[newIndex]
    internalContent.current = restored
    onChange(restored)
    setTimeout(() => {
      const ed = editorRef.current
      if (!ed) return
      ed.focus()
      ed.textContent = restored
      setCaretOffset(ed, restored.length)
    }, 0)
  }

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return
    isUndoRedoAction.current = true
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    const restored = history[newIndex]
    internalContent.current = restored
    onChange(restored)
    setTimeout(() => {
      const ed = editorRef.current
      if (!ed) return
      ed.focus()
      ed.textContent = restored
      setCaretOffset(ed, restored.length)
    }, 0)
  }

  const toolbarGroups: ToolbarItem[][] = [
    [
      { type: 'icon', icon: Undo2, label: 'Undo (Ctrl+Z)', action: handleUndo, disabled: historyIndex <= 0 },
      { type: 'icon', icon: Redo2, label: 'Redo (Ctrl+Y)', action: handleRedo, disabled: historyIndex >= history.length - 1 }
    ],
    [
      { type: 'text', text: 'B', textClass: 'font-bold text-[13px] leading-none', label: 'Bold', action: () => insertMarkdown('**', '**', 'bold text') },
      { type: 'text', text: 'I', textClass: 'italic text-[13px] leading-none', label: 'Italic', action: () => insertMarkdown('*', '*', 'italic text') }
    ],
    [
      { type: 'text', text: 'Aa', textClass: 'text-base font-semibold leading-none', label: 'Heading 1', action: () => insertMarkdown('# ', '', 'Heading') },
      { type: 'text', text: 'Aa', textClass: 'text-sm font-semibold leading-none', label: 'Heading 2', action: () => insertMarkdown('## ', '', 'Heading') },
      { type: 'text', text: 'Aa', textClass: 'text-xs font-semibold leading-none', label: 'Heading 3', action: () => insertMarkdown('### ', '', 'Heading') }
    ],
    [
      { type: 'icon', icon: Code, label: 'Inline Code', action: () => insertMarkdown('`', '`', 'code') }
    ],
    [
      { type: 'icon', icon: List, label: 'Bullet List', action: () => insertMarkdown('- ', '', 'list item') },
      { type: 'icon', icon: ListOrdered, label: 'Numbered List', action: () => insertMarkdown('1. ', '', 'list item') }
    ],
    [
      { type: 'icon', icon: Link, label: 'Link', action: () => insertMarkdown('[', '](url)', 'link text') },
      { type: 'icon', icon: Image, label: 'Image', action: () => insertMarkdown('![', '](url)', 'alt text') }
    ]
  ]

  const menuItems: ToolbarItem[] = [
    { type: 'icon', icon: Table2, label: 'Table', action: () => { insertTable(); setIsMenuOpen(false) } },
    { type: 'icon', icon: SquareCheck, label: 'Task List', action: () => { insertTaskList(); setIsMenuOpen(false) } },
    { type: 'icon', icon: Quote, label: 'Blockquote', action: () => { insertBlockquote(); setIsMenuOpen(false) } },
    { type: 'icon', icon: Code2, label: 'Code Block', action: () => { insertCodeBlock(); setIsMenuOpen(false) } },
    { type: 'icon', icon: Minus, label: 'Horizontal Rule', action: () => { insertHorizontalRule(); setIsMenuOpen(false) } },
    { type: 'icon', icon: Strikethrough, label: 'Strikethrough', action: () => { insertStrikethrough(); setIsMenuOpen(false) } },
    { type: 'icon', icon: ChevronDown, label: 'Footnote', action: () => { insertFootnote(); setIsMenuOpen(false) } },
    { type: 'icon', icon: ChevronDown, label: 'Collapsible Section', action: () => { insertCollapsible(); setIsMenuOpen(false) } }
  ]

  const btnBase = 'flex shrink-0 items-center justify-center rounded text-forest transition-colors duration-150 hover:bg-forest/10 active:scale-95'

  return (
    <div className="flex-1 flex flex-col bg-surface-1 overflow-hidden animate-fade-in">
      <div className="flex items-center border-b border-line bg-surface-2 shrink-0">
        <div className="flex items-center px-3 py-1.5 gap-0.5 overflow-x-auto flex-1 min-w-0">
          {toolbarGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="flex items-center gap-0.5 shrink-0">
              {groupIndex > 0 && (
                <div className="w-px h-5 bg-line mx-1 shrink-0" />
              )}
              {group.map(item => (
                item.type === 'icon' && item.icon ? (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`${btnBase} h-7 w-7 ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={item.label}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`${btnBase} h-7 min-w-7 px-1.5 ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={item.label}
                  >
                    <span className={item.textClass}>{item.text}</span>
                  </button>
                )
              ))}
            </div>
          ))}
        </div>

        <div className="w-px h-5 bg-line shrink-0" />

        <div className="relative shrink-0 px-1.5 py-1.5" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`${btnBase} h-7 w-7`}
            title="More formatting options"
          >
            <Ellipsis className="h-3.5 w-3.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-surface-1 border border-line rounded-lg shadow-lg z-50 py-1">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className="w-full px-3 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2 flex items-center gap-2.5 transition-colors"
                >
                  {item.icon && <item.icon className="h-3.5 w-3.5 text-forest shrink-0" />}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onScroll={() => onScrollChange?.(editorRef.current?.scrollTop ?? 0)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            document.execCommand('insertText', false, '\n')
          }
          if (e.key === 'Tab') {
            e.preventDefault()
            document.execCommand('insertText', false, '  ')
          }
          if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault()
            handleUndo()
          }
          if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault()
            handleRedo()
          }
        }}
        className="markdown-editor flex-1 px-8 py-10 bg-surface-1 text-ink-1 text-[0.95rem] leading-relaxed outline-none overflow-y-auto whitespace-pre-wrap wrap-break-word border-l-2 border-l-forest/20 animate-fade-in"
        spellCheck={false}
        data-placeholder="Write your markdown here..."
      />
    </div>
  )
}

export default MarkdownEditor
