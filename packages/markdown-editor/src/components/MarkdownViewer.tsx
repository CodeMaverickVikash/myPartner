import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'
import {
  Check,
  Code,
  Code2,
  ChevronDown,
  Copy,
  Ellipsis,
  Eye,
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
} from '@mypartner/common/dependencies'
import ImageLightbox from './ImageLightbox'
import { parseMarkdown } from '../lib/markdown'

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

interface ImageOverlayRect {
  left: number
  top: number
  width: number
  height: number
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
      if (node.classList.contains('image-row')) {
        const images = Array.from(node.children)
          .filter(child => child.tagName === 'IMG')
          .map(serializeNode)
        return images.length ? `${images.join(' ')}\n\n` : '\n'
      }
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
      const width = node.getAttribute('width') || node.style.width.replace('px', '')
      if (!src) return ''
      if (width) return `<img src="${src}" alt="${alt}" width="${width}" />`
      return `![${alt}](${src})`
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

function isImageOnlyParagraph(paragraph: HTMLParagraphElement) {
  const hasImage = Array.from(paragraph.children).some(child => child.tagName === 'IMG')
  if (!hasImage) return false

  return Array.from(paragraph.childNodes).every(node => {
    if (node.nodeType === Node.TEXT_NODE) return !(node.textContent ?? '').trim()
    return node instanceof HTMLElement && (node.tagName === 'IMG' || node.tagName === 'BR')
  })
}

function decorateImageRows(container: HTMLElement) {
  const paragraphs = Array.from(container.querySelectorAll('p'))

  paragraphs.forEach(paragraph => {
    paragraph.classList.toggle('image-row', isImageOnlyParagraph(paragraph))
  })

  for (const paragraph of Array.from(container.querySelectorAll<HTMLParagraphElement>('p.image-row'))) {
    let next = paragraph.nextElementSibling
    while (next instanceof HTMLParagraphElement && next.classList.contains('image-row')) {
      paragraph.append(document.createTextNode('\n'))
      Array.from(next.childNodes).forEach(child => paragraph.append(child))
      const stale = next
      next = next.nextElementSibling
      stale.remove()
    }
  }

  for (const paragraph of Array.from(container.querySelectorAll<HTMLParagraphElement>('p.image-row'))) {
    paragraph.querySelectorAll('br').forEach(br => br.remove())
    Array.from(paragraph.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim()) node.remove()
    })
    if (!paragraph.querySelector('img')) paragraph.remove()
  }
}

function MarkdownViewer({ content, markdownViewerRef, onContentChange }: MarkdownViewerProps) {
  const editable = Boolean(onContentChange)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const internalMarkdown = useRef(content)
  const savedRange = useRef<Range | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [deletePos, setDeletePos] = useState<{ x: number; y: number } | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedImgRef = useRef<HTMLImageElement | null>(null)
  const imageOverlayRef = useRef<HTMLDivElement | null>(null)
  const overlayToolbarRef = useRef<HTMLDivElement | null>(null)
  const [imgOverlay, setImgOverlay] = useState<ImageOverlayRect | null>(null)
  const resizingRef = useRef(false)
  const movingImgRef = useRef(false)
  const moveStartX = useRef(0)
  const moveStartY = useRef(0)
  const moveLastX = useRef(0)
  const moveLastY = useRef(0)
  const moveStartStyle = useRef({
    cursor: '',
    opacity: '',
    pointerEvents: '',
    position: '',
    zIndex: ''
  })
  const resizeStartX = useRef(0)
  const resizeStartW = useRef(0)
  const [resizeWidth, setResizeWidth] = useState<number | null>(null)

  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  const openLightbox = (img: HTMLImageElement) => {
    setLightbox({ src: img.src, alt: img.alt })
  }

  const getVisibleImageRect = (img: HTMLImageElement): ImageOverlayRect | null => {
    const viewer = markdownViewerRef.current
    if (!viewer) return null
    const rect = img.getBoundingClientRect()
    const viewerRect = viewer.getBoundingClientRect()
    if (rect.bottom < viewerRect.top || rect.top > viewerRect.bottom) return null
    const top = Math.max(rect.top, viewerRect.top)
    const bottom = Math.min(rect.bottom, viewerRect.bottom)
    return { left: rect.left, top, width: rect.width, height: bottom - top }
  }

  const updateImageOverlay = () => {
    const img = selectedImgRef.current
    setImgOverlay(img ? getVisibleImageRect(img) : null)
  }

  const clearImageSelection = () => {
    if (selectedImgRef.current) {
      selectedImgRef.current.style.cursor = ''
    }
    selectedImgRef.current = null
    setImgOverlay(null)
  }

  const selectImage = (img: HTMLImageElement) => {
    if (selectedImgRef.current && selectedImgRef.current !== img) {
      selectedImgRef.current.style.cursor = ''
    }
    selectedImgRef.current = img
    img.style.cursor = 'grab'
    window.getSelection()?.removeAllRanges()
    setDeletePos(null)
    setImgOverlay(getVisibleImageRect(img))
  }

  const getCaretRangeFromPoint = (x: number, y: number) => {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y)

    const position = document.caretPositionFromPoint?.(x, y)
    if (!position) return null

    const range = document.createRange()
    range.setStart(position.offsetNode, position.offset)
    range.collapse(true)
    return range
  }

  const findImageRowAtPoint = (x: number, y: number) => {
    const viewer = markdownViewerRef.current
    if (!viewer) return null

    const element = document.elementFromPoint(x, y)
    const rowFromPoint = element?.closest?.('p.image-row')
    if (rowFromPoint instanceof HTMLParagraphElement && viewer.contains(rowFromPoint)) {
      return rowFromPoint
    }

    return Array.from(viewer.querySelectorAll<HTMLParagraphElement>('p.image-row')).find(row => {
      const rect = row.getBoundingClientRect()
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    }) ?? null
  }

  const getImageRowDropRange = (row: HTMLParagraphElement, x: number, y: number) => {
    const img = selectedImgRef.current
    const images = Array.from(row.children).filter(
      child => child instanceof HTMLImageElement && child !== img
    ) as HTMLImageElement[]
    const range = document.createRange()

    if (images.length === 0) {
      range.selectNodeContents(row)
      range.collapse(false)
      return range
    }

    const closestLineCenter = images.reduce((closest, image) => {
      const rect = image.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      const distance = Math.abs(y - centerY)
      return distance < closest.distance ? { y: centerY, distance } : closest
    }, { y: 0, distance: Number.POSITIVE_INFINITY })

    const lineImages = images.filter(image => {
      const rect = image.getBoundingClientRect()
      const centerY = rect.top + rect.height / 2
      return Math.abs(centerY - closestLineCenter.y) < Math.max(8, rect.height / 2)
    }).sort((first, second) => first.getBoundingClientRect().left - second.getBoundingClientRect().left)

    for (const image of lineImages) {
      const rect = image.getBoundingClientRect()
      if (x < rect.left + rect.width / 2) {
        range.setStartBefore(image)
        range.collapse(true)
        return range
      }
    }

    range.setStartAfter(lineImages[lineImages.length - 1] ?? images[images.length - 1])
    range.collapse(true)
    return range
  }

  const getImageDropRange = (x: number, y: number) => {
    const viewer = markdownViewerRef.current
    const img = selectedImgRef.current
    if (!viewer || !img) return null

    const imageRow = findImageRowAtPoint(x, y)
    if (imageRow) return getImageRowDropRange(imageRow, x, y)

    const range = getCaretRangeFromPoint(x, y)
    if (!range) {
      const viewerRect = viewer.getBoundingClientRect()
      if (x < viewerRect.left || x > viewerRect.right || y < viewerRect.top || y > viewerRect.bottom) return null
      const appendRange = document.createRange()
      appendRange.selectNodeContents(viewer)
      appendRange.collapse(false)
      return appendRange
    }
    if (!viewer.contains(range.startContainer)) return null
    if (range.intersectsNode(img)) return null
    return range
  }

  const moveImageToRange = (img: HTMLImageElement, range: Range, updateSelection = false) => {
    range.insertNode(img)
    range.setStartAfter(img)
    range.collapse(true)
    if (!updateSelection) return

    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    selectedImgRef.current = img
  }

  const placeCaretAfterImage = (img: HTMLImageElement) => {
    const range = document.createRange()
    range.setStartAfter(img)
    range.collapse(true)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  useEffect(() => {
    if (!editable) return
    const onSelectionChange = () => {
      const viewer = markdownViewerRef.current
      const sel = window.getSelection()
      if (selectedImgRef.current) { setDeletePos(null); return }
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

  useEffect(() => {
    if (!editable) return
    try {
      document.execCommand('enableObjectResizing', false, 'false')
    } catch {
      // Some browsers do not support disabling native contenteditable image handles.
    }
  }, [editable])

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
    decorateImageRows(viewer)

    const headings = viewer.querySelectorAll('h1, h2, h3, h4, h5, h6')
    headings.forEach(heading => {
      heading.id = (heading.textContent ?? '').toLowerCase().replace(/[^\w]+/g, '-')
    })
  }, [content, markdownViewerRef])

  useEffect(() => {
    const viewer = markdownViewerRef.current
    if (!viewer || viewer.innerHTML) return

    viewer.innerHTML = parseMarkdown(content)
    decorateImageRows(viewer)
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

    decorateImageRows(viewer)
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

  const handleDeleteImage = () => {
    selectedImgRef.current?.remove()
    clearImageSelection()
    syncContent()
  }

  const handleImagePointerDown = (e: React.PointerEvent, img: HTMLImageElement) => {
    e.preventDefault()
    selectImage(img)
    let frameId = 0
    let lastDropContainer: Node | null = null
    let lastDropOffset = -1
    moveStartX.current = e.clientX
    moveStartY.current = e.clientY
    moveLastX.current = e.clientX
    moveLastY.current = e.clientY
    moveStartStyle.current = {
      cursor: img.style.cursor,
      opacity: img.style.opacity,
      pointerEvents: img.style.pointerEvents,
      position: img.style.position,
      zIndex: img.style.zIndex
    }

    const applyPendingMove = () => {
      frameId = 0
      const deltaX = moveLastX.current - moveStartX.current
      const deltaY = moveLastY.current - moveStartY.current

      if (!movingImgRef.current && Math.hypot(deltaX, deltaY) < 6) return

      if (!movingImgRef.current) {
        movingImgRef.current = true
        img.dataset.imageMoving = 'true'
        img.style.opacity = '0.55'
        img.style.cursor = 'grabbing'
        img.style.pointerEvents = 'none'
        img.style.position = 'relative'
        img.style.zIndex = '101'
      }

      const dropRange = getImageDropRange(moveLastX.current, moveLastY.current)
      if (!dropRange) {
        updateImageOverlay()
        return
      }

      if (dropRange.startContainer === lastDropContainer && dropRange.startOffset === lastDropOffset) {
        updateImageOverlay()
        return
      }

      lastDropContainer = dropRange.startContainer
      lastDropOffset = dropRange.startOffset
      moveImageToRange(img, dropRange)
      updateImageOverlay()
    }

    const scheduleMove = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(applyPendingMove)
    }

    const onMove = (ev: PointerEvent) => {
      moveLastX.current = ev.clientX
      moveLastY.current = ev.clientY
      scheduleMove()
    }

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      moveLastX.current = ev.clientX
      moveLastY.current = ev.clientY
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      applyPendingMove()

      const wasMoving = movingImgRef.current
      movingImgRef.current = false
      img.style.cursor = moveStartStyle.current.cursor
      img.style.opacity = moveStartStyle.current.opacity
      img.style.pointerEvents = moveStartStyle.current.pointerEvents
      img.style.position = moveStartStyle.current.position
      img.style.zIndex = moveStartStyle.current.zIndex
      delete img.dataset.imageMoving

      if (!wasMoving) {
        updateImageOverlay()
        return
      }

      selectedImgRef.current = img
      placeCaretAfterImage(img)
      updateImageOverlay()
      syncContent()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const handleResizePointerDown = (e: React.PointerEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    const img = selectedImgRef.current
    if (!img) return
    e.preventDefault()
    e.stopPropagation()
    resizingRef.current = true
    resizeStartX.current = e.clientX
    resizeStartW.current = img.offsetWidth
    const leftSide = corner === 'nw' || corner === 'sw'

    const onMove = (ev: PointerEvent) => {
      if (!resizingRef.current || !selectedImgRef.current) return
      const viewerWidth = markdownViewerRef.current?.clientWidth ?? Number.POSITIVE_INFINITY
      const naturalWidth = selectedImgRef.current.naturalWidth || Number.POSITIVE_INFINITY
      const maxWidth = Math.max(50, Math.min(viewerWidth, naturalWidth))
      const delta = leftSide ? resizeStartX.current - ev.clientX : ev.clientX - resizeStartX.current
      const newW = Math.max(50, Math.min(maxWidth, resizeStartW.current + delta))
      selectedImgRef.current.style.width = `${newW}px`
      selectedImgRef.current.style.height = 'auto'
      selectedImgRef.current.setAttribute('width', String(Math.round(newW)))
      selectedImgRef.current.removeAttribute('height')
      setResizeWidth(Math.round(newW))
      updateImageOverlay()
    }

    const onUp = () => {
      resizingRef.current = false
      setResizeWidth(null)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      syncContent()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  // Sync overlay position directly to DOM — runs after every render so position is never stale
  useEffect(() => {
    const img = selectedImgRef.current
    const el = imageOverlayRef.current
    if (!img || !el || !imgOverlay) return
    const rect = getVisibleImageRect(img)
    if (!rect) return
    el.style.left = `${rect.left}px`
    el.style.top = `${rect.top}px`
    el.style.width = `${rect.width}px`
    el.style.height = `${rect.height}px`
    const toolbar = overlayToolbarRef.current
    if (toolbar) {
      const viewerTop = markdownViewerRef.current?.getBoundingClientRect().top ?? 0
      if (rect.top - viewerTop > 40) {
        toolbar.style.bottom = '100%'; toolbar.style.marginBottom = '6px'
        toolbar.style.top = ''; toolbar.style.marginTop = ''
      } else {
        toolbar.style.top = '100%'; toolbar.style.marginTop = '6px'
        toolbar.style.bottom = ''; toolbar.style.marginBottom = ''
      }
    }
  })

  useEffect(() => {
    if (!imgOverlay) return
    const viewer = markdownViewerRef.current
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearImageSelection()
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        handleDeleteImage()
      }
    }
    // Direct DOM update during scroll — no setImgOverlay so no re-render lag
    const onScroll = () => {
      const img = selectedImgRef.current
      const el = imageOverlayRef.current
      if (!img || !el) return
      const rect = getVisibleImageRect(img)
      if (!rect) { clearImageSelection(); return }
      el.style.left = `${rect.left}px`
      el.style.top = `${rect.top}px`
      el.style.width = `${rect.width}px`
      el.style.height = `${rect.height}px`
      const toolbar = overlayToolbarRef.current
      if (toolbar) {
        const viewerTop = markdownViewerRef.current?.getBoundingClientRect().top ?? 0
        if (rect.top - viewerTop > 40) {
          toolbar.style.bottom = '100%'; toolbar.style.marginBottom = '6px'
          toolbar.style.top = ''; toolbar.style.marginTop = ''
        } else {
          toolbar.style.top = '100%'; toolbar.style.marginTop = '6px'
          toolbar.style.bottom = ''; toolbar.style.marginBottom = ''
        }
      }
    }
    document.addEventListener('keydown', onKey)
    viewer?.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('keydown', onKey)
      viewer?.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [imgOverlay, markdownViewerRef])

  const handleCopyMarkdown = async () => {
    await navigator.clipboard.writeText(internalMarkdown.current)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const btnBase = 'flex shrink-0 items-center justify-center rounded text-forest transition-colors duration-150 hover:bg-forest/10 active:scale-95 cursor-pointer'

  return (
    <div ref={rootRef} className="relative flex-1 flex flex-col overflow-hidden bg-surface-0 animate-fade-in">
      {editable && (
        <div className="sticky top-0 z-10 flex items-center border-b border-line bg-surface-2 shrink-0">
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
                    className="w-full px-3 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    {item.icon && <item.icon className="h-3.5 w-3.5 text-forest shrink-0" />}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-line shrink-0" />

          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={handleCopyMarkdown}
            className={`${btnBase} h-7 w-7 mx-1.5`}
            title="Copy markdown"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
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
        onPointerDown={editable ? (e) => {
          if (e.target instanceof HTMLImageElement) handleImagePointerDown(e, e.target)
        } : undefined}
        onMouseDown={editable ? (e) => {
          if (e.target instanceof HTMLImageElement) {
            e.preventDefault()
            selectImage(e.target)
          }
        } : undefined}
        onClick={(e) => {
          if (e.target instanceof HTMLImageElement) {
            if (editable) {
              selectImage(e.target)
            } else {
              openLightbox(e.target)
            }
          } else {
            clearImageSelection()
          }
        }}
        onPaste={event => {
          event.preventDefault()

          const items = Array.from(event.clipboardData.items)
          const imageItem = items.find(item => item.type.startsWith('image/'))

          if (imageItem) {
            const file = imageItem.getAsFile()
            if (file) {
              const reader = new FileReader()
              reader.onload = () => {
                runCommand('insertHTML', `<img src="${reader.result as string}" alt="" style="max-width:100%" />`)
              }
              reader.readAsDataURL(file)
              return
            }
          }

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

      {deletePos && editable && createPortal(
        <button
          style={{ position: 'fixed', left: deletePos.x, top: deletePos.y, transform: 'translate(-50%, calc(-100% - 6px))' }}
          className="z-200 flex items-center gap-1.5 px-2.5 py-1 bg-crimson text-white text-xs font-medium rounded-md shadow-lg cursor-pointer select-none transition-opacity"
          onMouseDown={e => e.preventDefault()}
          onClick={handleDeleteSelection}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>,
        document.body
      )}

      {imgOverlay && editable && createPortal(
        <div
          ref={imageOverlayRef}
          style={{ position: 'fixed', pointerEvents: 'none', zIndex: 200 }}
        >
          {/* floating toolbar — position is set imperatively by useEffect / scroll handler */}
          <div
            ref={overlayToolbarRef}
            style={{ position: 'absolute', left: 0, pointerEvents: 'all' }}
            className="flex items-center gap-1.5 bg-surface-0 border border-line rounded-lg shadow-lg px-2 py-1 select-none"
          >
            {resizeWidth !== null && (
              <>
                <span className="text-xs text-ink-2 font-mono tabular-nums">{resizeWidth}px</span>
                <div className="w-px h-3.5 bg-line" />
              </>
            )}
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-ink-2 hover:bg-surface-2 rounded cursor-pointer transition-colors"
              title="View image"
              onMouseDown={e => e.preventDefault()}
              onClick={() => selectedImgRef.current && openLightbox(selectedImgRef.current)}
            >
              <Eye className="w-3 h-3" />
              View
            </button>
            <div className="w-px h-3.5 bg-line" />
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-crimson hover:bg-crimson/10 rounded cursor-pointer transition-colors"
              title="Delete image (Del)"
              onMouseDown={e => e.preventDefault()}
              onClick={handleDeleteImage}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>

          {/* selection border */}
          <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--color-forest)', borderRadius: 12, pointerEvents: 'none', boxShadow: '0 0 0 3px color-mix(in srgb, var(--color-forest) 15%, transparent)' }} />

          {/* NW corner handle */}
          <div
            style={{ position: 'absolute', top: -5, left: -5, width: 10, height: 10, pointerEvents: 'all', cursor: 'nwse-resize', background: 'white', border: '2px solid var(--color-forest)', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
            onPointerDown={e => handleResizePointerDown(e, 'nw')}
          />
          {/* NE corner handle */}
          <div
            style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, pointerEvents: 'all', cursor: 'nesw-resize', background: 'white', border: '2px solid var(--color-forest)', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
            onPointerDown={e => handleResizePointerDown(e, 'ne')}
          />
          {/* SW corner handle */}
          <div
            style={{ position: 'absolute', bottom: -5, left: -5, width: 10, height: 10, pointerEvents: 'all', cursor: 'nesw-resize', background: 'white', border: '2px solid var(--color-forest)', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
            onPointerDown={e => handleResizePointerDown(e, 'sw')}
          />
          {/* SE corner handle */}
          <div
            style={{ position: 'absolute', bottom: -5, right: -5, width: 10, height: 10, pointerEvents: 'all', cursor: 'nwse-resize', background: 'white', border: '2px solid var(--color-forest)', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
            onPointerDown={e => handleResizePointerDown(e, 'se')}
          />
        </div>,
        document.body
      )}

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

export default MarkdownViewer
