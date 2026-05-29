import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  Code,
  Code2,
  ChevronDown,
  Ellipsis,
  Image,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCheck,
  Strikethrough,
  Table2,
  Trash2,
  Undo2,
  type LucideIcon
} from 'lucide-react'
import { parseMarkdown } from '../utils/markdown'

interface MarkdownViewerProps {
  content: string
  markdownViewerRef: RefObject<HTMLDivElement | null>
  onContentChange?: (content: string) => void
}

interface ToolbarItem {
  type: 'icon' | 'text'
  icon?: LucideIcon
  text?: string
  textClass?: string
  label: string
  action: () => void
}

const blockTags = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'HEADER',
  'MAIN',
  'NAV',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'UL',
  'OL',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6'
])

function escapeTableCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()
}

function serializeChildren(element: Element): string {
  return Array.from(element.childNodes).map(serializeNode).join('')
}

function serializeListItem(element: HTMLElement, marker: string) {
  const checkbox = element.querySelector(':scope > input[type="checkbox"]') as HTMLInputElement | null
  const body = Array.from(element.childNodes)
    .filter(node => node !== checkbox)
    .map(serializeNode)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .replace(/\n/g, '\n  ')

  if (checkbox) {
    return `${marker} [${checkbox.checked ? 'x' : ' '}] ${body}\n`
  }

  return `${marker} ${body}\n`
}

function serializeTable(table: HTMLTableElement) {
  const rows = Array.from(table.querySelectorAll('tr'))
    .map(row => Array.from(row.children).map(cell => escapeTableCell(cell.textContent ?? '')))
    .filter(cells => cells.length > 0)

  if (rows.length === 0) return ''

  const [header, ...body] = rows
  const separator = header.map(() => '---')
  return `\n\n| ${header.join(' | ')} |\n| ${separator.join(' | ')} |\n${body
    .map(row => `| ${row.join(' | ')} |`)
    .join('\n')}\n\n`
}

function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ''
  }

  if (!(node instanceof HTMLElement)) return ''

  const tag = node.tagName
  const text = node.textContent ?? ''

  switch (tag) {
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6': {
      const level = Number(tag.slice(1))
      return `\n\n${'#'.repeat(level)} ${serializeChildren(node).trim()}\n\n`
    }
    case 'P': {
      const body = serializeChildren(node).trim()
      return body ? `${body}\n\n` : '\n'
    }
    case 'BR':
      return '\n'
    case 'STRONG':
    case 'B':
      return `**${serializeChildren(node).trim()}**`
    case 'EM':
    case 'I':
      return `*${serializeChildren(node).trim()}*`
    case 'S':
    case 'DEL':
      return `~~${serializeChildren(node).trim()}~~`
    case 'CODE':
      if (node.parentElement?.tagName === 'PRE') return text
      return `\`${text.replace(/`/g, '\\`')}\``
    case 'PRE':
      return `\n\n\`\`\`\n${text.trimEnd()}\n\`\`\`\n\n`
    case 'A': {
      const href = node.getAttribute('href')
      const body = serializeChildren(node).trim() || href || ''
      return href ? `[${body}](${href})` : body
    }
    case 'IMG': {
      const src = node.getAttribute('src') ?? ''
      const alt = node.getAttribute('alt') ?? ''
      return src ? `![${alt}](${src})` : ''
    }
    case 'BLOCKQUOTE': {
      const body = serializeChildren(node).trim()
      return body ? `\n\n${body.split('\n').map(line => `> ${line}`).join('\n')}\n\n` : ''
    }
    case 'UL':
      return `\n${Array.from(node.children)
        .filter(child => child.tagName === 'LI')
        .map(child => serializeListItem(child as HTMLElement, '-'))
        .join('')}\n`
    case 'OL':
      return `\n${Array.from(node.children)
        .filter(child => child.tagName === 'LI')
        .map((child, index) => serializeListItem(child as HTMLElement, `${index + 1}.`))
        .join('')}\n`
    case 'LI':
      return serializeListItem(node, '-')
    case 'TABLE':
      return serializeTable(node as HTMLTableElement)
    case 'HR':
      return '\n\n---\n\n'
    case 'SUP':
      return text
    case 'SUMMARY':
      return `<summary>${serializeChildren(node).trim()}</summary>`
    case 'DETAILS': {
      const summary = node.querySelector(':scope > summary')
      const summaryMarkdown = summary ? serializeNode(summary) : '<summary>Click to expand</summary>'
      const body = Array.from(node.childNodes)
        .filter(child => child !== summary)
        .map(serializeNode)
        .join('')
        .trim()

      return `\n\n<details>\n${summaryMarkdown}\n\n${body}\n\n</details>\n\n`
    }
    default: {
      const body = serializeChildren(node)
      return blockTags.has(tag) ? `\n${body}\n` : body
    }
  }
}

function htmlToMarkdown(element: HTMLElement) {
  return Array.from(element.childNodes)
    .map(serializeNode)
    .join('')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function MarkdownViewer({ content, markdownViewerRef, onContentChange }: MarkdownViewerProps) {
  const editable = Boolean(onContentChange)
  const internalMarkdown = useRef(content)
  const savedRange = useRef<Range | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [deletePos, setDeletePos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!editable) return
    const onSelectionChange = () => {
      const viewer = markdownViewerRef.current
      const sel = window.getSelection()
      if (!viewer || !sel || sel.isCollapsed || !sel.rangeCount) { setDeletePos(null); return }
      const range = sel.getRangeAt(0)
      if (!viewer.contains(range.commonAncestorContainer)) { setDeletePos(null); return }
      savedRange.current = range.cloneRange()
      const rect = range.getBoundingClientRect()
      setDeletePos({ x: rect.left + rect.width / 2, y: rect.top })
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [editable, markdownViewerRef])

  const handleDeleteSelection = () => {
    restoreSelection()
    const sel = window.getSelection()
    if (sel && sel.rangeCount) sel.getRangeAt(0).deleteContents()
    syncContent()
    setDeletePos(null)
  }

  useEffect(() => {
    const viewer = markdownViewerRef.current
    if (!viewer || internalMarkdown.current === content) return

    internalMarkdown.current = content
    viewer.innerHTML = parseMarkdown(content)

    const headings = viewer.querySelectorAll('h1, h2, h3, h4, h5, h6')
    headings.forEach(heading => {
      heading.id = (heading.textContent ?? '').toLowerCase().replace(/[^\w]+/g, '-')
    })
  }, [content, markdownViewerRef])

  useEffect(() => {
    const viewer = markdownViewerRef.current
    if (!viewer || viewer.innerHTML) return

    viewer.innerHTML = parseMarkdown(content)
    internalMarkdown.current = content
  }, [content, markdownViewerRef])

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

  const selectionBelongsToViewer = () => {
    const viewer = markdownViewerRef.current
    const selection = window.getSelection()
    if (!viewer || !selection || !selection.rangeCount) return false

    const range = selection.getRangeAt(0)
    return viewer.contains(range.commonAncestorContainer)
  }

  const saveSelection = () => {
    const selection = window.getSelection()
    if (!selection || !selection.rangeCount || !selectionBelongsToViewer()) return
    savedRange.current = selection.getRangeAt(0).cloneRange()
  }

  const restoreSelection = () => {
    const viewer = markdownViewerRef.current
    const selection = window.getSelection()
    if (!viewer || !selection) return

    viewer.focus()
    if (savedRange.current) {
      selection.removeAllRanges()
      selection.addRange(savedRange.current)
    }
  }

  const syncContent = () => {
    const viewer = markdownViewerRef.current
    if (!viewer || !onContentChange) return

    const nextMarkdown = htmlToMarkdown(viewer)
    internalMarkdown.current = nextMarkdown
    onContentChange(nextMarkdown)
  }

  const runCommand = (command: string, value?: string) => {
    restoreSelection()
    document.execCommand(command, false, value)
    saveSelection()
    syncContent()
  }

  const insertHtml = (html: string) => {
    runCommand('insertHTML', html)
  }

  const wrapSelectionWithCode = () => {
    restoreSelection()

    const selection = window.getSelection()
    if (!selection || !selection.rangeCount) return

    const range = selection.getRangeAt(0)
    const code = document.createElement('code')

    if (range.collapsed) {
      code.textContent = 'code'
      range.insertNode(code)
      range.selectNodeContents(code)
    } else {
      try {
        range.surroundContents(code)
      } catch {
        code.append(range.extractContents())
        range.insertNode(code)
      }
    }

    selection.removeAllRanges()
    selection.addRange(range)
    saveSelection()
    syncContent()
  }

  const createLink = () => {
    const url = window.prompt('Enter link URL')
    if (!url) return
    runCommand('createLink', url)
  }

  const insertImage = () => {
    const url = window.prompt('Enter image URL')
    if (!url) return
    runCommand('insertImage', url)
  }

  const insertTable = () => {
    insertHtml(`
      <table>
        <thead><tr><th>Header 1</th><th>Header 2</th><th>Header 3</th></tr></thead>
        <tbody>
          <tr><td>Cell 1</td><td>Cell 2</td><td>Cell 3</td></tr>
          <tr><td>Cell 4</td><td>Cell 5</td><td>Cell 6</td></tr>
        </tbody>
      </table>
    `)
  }

  const insertTaskList = () => {
    insertHtml('<ul><li><input type="checkbox"> Task item</li></ul>')
  }

  const insertCodeBlock = () => {
    insertHtml('<pre><code>code here</code></pre>')
  }

  const insertFootnote = () => {
    runCommand('insertText', '[^1]')
  }

  const insertCollapsible = () => {
    insertHtml(`
      <details open>
        <summary>Click to expand</summary>
        <p>Content goes here</p>
      </details>
    `)
  }

  const toolbarGroups: ToolbarItem[][] = [
    [
      { type: 'icon', icon: Undo2, label: 'Undo', action: () => runCommand('undo') },
      { type: 'icon', icon: Redo2, label: 'Redo', action: () => runCommand('redo') }
    ],
    [
      { type: 'text', text: 'B', textClass: 'font-bold text-[13px] leading-none', label: 'Bold', action: () => runCommand('bold') },
      { type: 'text', text: 'I', textClass: 'italic text-[13px] leading-none', label: 'Italic', action: () => runCommand('italic') }
    ],
    [
      { type: 'text', text: 'Aa', textClass: 'text-base font-semibold leading-none', label: 'Heading 1', action: () => runCommand('formatBlock', 'h1') },
      { type: 'text', text: 'Aa', textClass: 'text-sm font-semibold leading-none', label: 'Heading 2', action: () => runCommand('formatBlock', 'h2') },
      { type: 'text', text: 'Aa', textClass: 'text-xs font-semibold leading-none', label: 'Heading 3', action: () => runCommand('formatBlock', 'h3') }
    ],
    [
      { type: 'icon', icon: Code, label: 'Code', action: wrapSelectionWithCode }
    ],
    [
      { type: 'icon', icon: List, label: 'Bullet list', action: () => runCommand('insertUnorderedList') },
      { type: 'icon', icon: ListOrdered, label: 'Numbered list', action: () => runCommand('insertOrderedList') }
    ],
    [
      { type: 'icon', icon: Link, label: 'Link', action: createLink },
      { type: 'icon', icon: Image, label: 'Image', action: insertImage }
    ]
  ]

  const moreMenuItems: ToolbarItem[] = [
    { type: 'icon', icon: Table2, label: 'Table', action: () => { insertTable(); setIsMenuOpen(false) } },
    { type: 'icon', icon: SquareCheck, label: 'Task List', action: () => { insertTaskList(); setIsMenuOpen(false) } },
    { type: 'icon', icon: Quote, label: 'Blockquote', action: () => { runCommand('formatBlock', 'blockquote'); setIsMenuOpen(false) } },
    { type: 'icon', icon: Code2, label: 'Code Block', action: () => { insertCodeBlock(); setIsMenuOpen(false) } },
    { type: 'icon', icon: Minus, label: 'Horizontal Rule', action: () => { runCommand('insertHorizontalRule'); setIsMenuOpen(false) } },
    { type: 'icon', icon: Strikethrough, label: 'Strikethrough', action: () => { runCommand('strikeThrough'); setIsMenuOpen(false) } },
    { type: 'icon', icon: ChevronDown, label: 'Footnote', action: () => { insertFootnote(); setIsMenuOpen(false) } },
    { type: 'icon', icon: ChevronDown, label: 'Collapsible Section', action: () => { insertCollapsible(); setIsMenuOpen(false) } }
  ]

  const btnBase = 'flex shrink-0 items-center justify-center rounded text-forest transition-colors duration-150 hover:bg-forest/10 active:scale-95'

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface-0 animate-fade-in">
      {editable && (
        <div className="flex items-center border-b border-line bg-surface-2 shrink-0">
          <div className="flex items-center px-3 py-1.5 gap-0.5 overflow-x-auto min-w-0">
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
                      className={`${btnBase} h-7 w-7`}
                      title={item.label}
                      onMouseDown={e => e.preventDefault()}
                      onClick={item.action}
                    >
                      <item.icon className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      key={item.label}
                      type="button"
                      className={`${btnBase} h-7 min-w-7 px-1.5`}
                      title={item.label}
                      onMouseDown={e => e.preventDefault()}
                      onClick={item.action}
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
              title="More formatting"
            >
              <Ellipsis className="h-3.5 w-3.5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-surface-1 border border-line rounded-lg shadow-lg z-50 py-1">
                {moreMenuItems.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
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
      )}

      <div
        ref={markdownViewerRef}
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={syncContent}
        onBlur={syncContent}
        onFocus={saveSelection}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onPaste={event => {
          event.preventDefault()
          const text = event.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
          syncContent()
        }}
        onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && ['b', 'i', 'z', 'y'].includes(event.key.toLowerCase())) {
            window.setTimeout(syncContent, 0)
          }
        }}
        className={`markdown-content flex-1 overflow-y-auto bg-surface-1 px-8 pb-8 pt-6 outline-none border-l-2 border-l-forest/20 shadow-[-2px_0_0_0_rgba(0,0,0,0.04)] ${
          editable ? 'cursor-text focus:ring-0 focus:border-l-forest/50' : ''
        }`}
        spellCheck={editable}
      />

      {deletePos && editable && (
        <button
          style={{ position: 'fixed', left: deletePos.x, top: deletePos.y, transform: 'translate(-50%, calc(-100% - 6px))' }}
          className="z-200 flex items-center gap-1.5 px-2.5 py-1 bg-crimson text-white text-xs font-medium rounded-md shadow-lg cursor-pointer select-none transition-opacity"
          onMouseDown={e => e.preventDefault()}
          onClick={handleDeleteSelection}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      )}
    </div>
  )
}

export default MarkdownViewer
