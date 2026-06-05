import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RefObject } from 'react'
import {
  Check,
  Code,
  Code2,
  ChevronDown,
  Columns3,
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
  Rows3,
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

interface TableSelection {
  tableTop: number
  tableLeft: number
  tableWidth: number
  rowIndex: number
  colIndex: number
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isImageUrl(value: string) {
  return /^(https?:\/\/|data:image\/|blob:).+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value) ||
    /^data:image\//i.test(value) ||
    /^blob:/i.test(value)
}

function imageToMarkdown(img: HTMLImageElement) {
  const src = img.getAttribute('src') ?? ''
  const alt = img.getAttribute('alt') ?? ''
  const width = img.getAttribute('width') || img.style.width.replace('px', '')
  if (width) return `<img src="${src}" alt="${alt}" width="${width}" />`
  return `![${alt}](${src})`
}

function imageToHtml(src: string, alt = '', width?: string) {
  const widthAttr = width ? ` width="${escapeHtmlAttribute(width)}"` : ''
  return `<img src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(alt)}"${widthAttr} style="max-width:100%" />`
}

function createImageElement(src: string, alt = '', width?: string) {
  const img = document.createElement('img')
  img.src = src
  img.alt = alt
  img.style.maxWidth = '100%'
  if (width) img.setAttribute('width', width)
  return img
}

function extractImagesFromHtml(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  return Array.from(template.content.querySelectorAll('img'))
    .map(img => ({
      src: img.getAttribute('src') ?? '',
      alt: img.getAttribute('alt') ?? '',
      width: img.getAttribute('width') ?? ''
    }))
    .filter(image => image.src)
}

function extractMarkdownImages(text: string) {
  const images: Array<{ src: string; alt: string; width?: string }> = []
  const markdownImagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  const htmlImagePattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi
  let match: RegExpExecArray | null

  while ((match = markdownImagePattern.exec(text))) {
    images.push({ alt: match[1] ?? '', src: match[2] ?? '' })
  }

  while ((match = htmlImagePattern.exec(text))) {
    const html = match[0]
    const alt = html.match(/\balt=["']([^"']*)["']/i)?.[1] ?? ''
    const width = html.match(/\bwidth=["']([^"']*)["']/i)?.[1]
    images.push({ alt, src: match[1] ?? '', width })
  }

  return images.filter(image => image.src)
}

function containsOnlyImagesAsText(text: string) {
  return text
    .trim()
    .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '')
    .replace(/<img\b[^>]*>/gi, '')
    .trim().length === 0
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

function getStyleAttribute(styles: Array<[string, string | null | undefined]>) {
  const value = styles
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, styleValue]) => `${name}: ${styleValue}`)
    .join('; ')

  return value ? ` style="${escapeHtmlAttribute(value)}"` : ''
}

function tableHasCustomLayout(table: HTMLTableElement) {
  if (table.style.width) return true
  return Array.from(table.querySelectorAll('tr, th, td')).some(element => {
    const htmlElement = element as HTMLElement
    return Boolean(htmlElement.style.width || htmlElement.style.minWidth || htmlElement.style.height)
  })
}

function serializeHtmlTableCell(cell: HTMLTableCellElement) {
  const tag = cell.tagName.toLowerCase()
  const style = getStyleAttribute([
    ['width', cell.style.width],
    ['min-width', cell.style.minWidth],
    ['height', cell.style.height]
  ])

  return `<${tag}${style}>${cell.innerHTML}</${tag}>`
}

function serializeHtmlTableRow(row: HTMLTableRowElement) {
  const style = getStyleAttribute([['height', row.style.height]])
  return `<tr${style}>${Array.from(row.cells).map(serializeHtmlTableCell).join('')}</tr>`
}

function serializeHtmlTable(table: HTMLTableElement) {
  const sections: string[] = []
  const tableStyle = getStyleAttribute([['width', table.style.width]])

  if (table.tHead) {
    sections.push(`<thead>${Array.from(table.tHead.rows).map(serializeHtmlTableRow).join('')}</thead>`)
  }

  Array.from(table.tBodies).forEach(section => {
    sections.push(`<tbody>${Array.from(section.rows).map(serializeHtmlTableRow).join('')}</tbody>`)
  })

  if (table.tFoot) {
    sections.push(`<tfoot>${Array.from(table.tFoot.rows).map(serializeHtmlTableRow).join('')}</tfoot>`)
  }

  const rowsWithoutSection = Array.from(table.children)
    .filter((child): child is HTMLTableRowElement => child instanceof HTMLTableRowElement)
  const looseRows = rowsWithoutSection.map(serializeHtmlTableRow).join('')

  return `\n\n<table${tableStyle}>\n${sections.join('\n')}${looseRows ? `\n${looseRows}` : ''}\n</table>\n\n`
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
  if (tableHasCustomLayout(table)) return serializeHtmlTable(table)

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
      if (node.classList.contains('table-scroll-wrapper')) return body
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

function decorateTables(container: HTMLElement) {
  Array.from(container.querySelectorAll<HTMLTableElement>('table')).forEach(table => {
    if (table.parentElement?.classList.contains('table-scroll-wrapper')) return
    const wrapper = document.createElement('div')
    wrapper.className = 'table-scroll-wrapper'
    table.before(wrapper)
    wrapper.append(table)
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
  const [imageCopied, setImageCopied] = useState(false)

  const selectedImgRef = useRef<HTMLImageElement | null>(null)
  const imageOverlayRef = useRef<HTMLDivElement | null>(null)
  const overlayToolbarRef = useRef<HTMLDivElement | null>(null)
  const [imgOverlay, setImgOverlay] = useState<ImageOverlayRect | null>(null)
  const resizingRef = useRef(false)
  const colResizingRef = useRef(false)
  const rowResizingRef = useRef(false)
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
  const selectedCellRef = useRef<HTMLTableCellElement | null>(null)
  const tableToolbarRef = useRef<HTMLDivElement | null>(null)
  const [tableSelection, setTableSelection] = useState<TableSelection | null>(null)

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

  const clearTableSelection = () => {
    if (selectedCellRef.current) selectedCellRef.current.classList.remove('table-cell-selected')
    selectedCellRef.current = null
    setTableSelection(null)
  }

  const selectImage = (img: HTMLImageElement) => {
    clearTableSelection()
    if (selectedImgRef.current && selectedImgRef.current !== img) {
      selectedImgRef.current.style.cursor = ''
    }
    selectedImgRef.current = img
    img.style.cursor = 'grab'
    window.getSelection()?.removeAllRanges()
    setDeletePos(null)
    setImgOverlay(getVisibleImageRect(img))
  }

  const getCellColumnIndex = (cell: HTMLTableCellElement) => {
    return Array.from(cell.parentElement?.children ?? []).indexOf(cell)
  }

  const getCellRowIndex = (cell: HTMLTableCellElement) => {
    const table = cell.closest('table')
    const row = cell.parentElement
    if (!table || !(row instanceof HTMLTableRowElement)) return -1
    return Array.from(table.rows).indexOf(row)
  }

  const getCellFromSelection = () => {
    const viewer = markdownViewerRef.current
    const selection = window.getSelection()
    if (!viewer || !selection || !selection.rangeCount) return null

    const node = selection.getRangeAt(0).commonAncestorContainer
    const element = node instanceof Element ? node : node.parentElement
    const cell = element?.closest('th, td')
    return cell instanceof HTMLTableCellElement && viewer.contains(cell) ? cell : null
  }

  const selectTableCell = (cell: HTMLTableCellElement | null) => {
    if (!cell) {
      clearTableSelection()
      return
    }

    if (selectedCellRef.current && selectedCellRef.current !== cell) {
      selectedCellRef.current.classList.remove('table-cell-selected')
    }

    selectedCellRef.current = cell
    selectedCellRef.current.classList.add('table-cell-selected')
    clearImageSelection()

    const table = cell.closest('table')
    const container = (table?.closest('.table-scroll-wrapper') ?? table) as HTMLElement | null
    const containerRect = (container ?? cell).getBoundingClientRect()
    setTableSelection({
      tableTop: containerRect.top,
      tableLeft: containerRect.left,
      tableWidth: containerRect.width,
      rowIndex: getCellRowIndex(cell),
      colIndex: getCellColumnIndex(cell)
    })
  }

  const updateSelectedTableCell = () => {
    selectTableCell(getCellFromSelection())
  }

  const createTableCell = (tagName: 'td' | 'th', text = '') => {
    const cell = document.createElement(tagName)
    cell.textContent = text || '\u00A0'
    return cell
  }

  const createTable = () => {
    const table = document.createElement('table')
    const thead = document.createElement('thead')
    const headerRow = document.createElement('tr')
    ;['Header 1', 'Header 2', 'Header 3'].forEach(text => headerRow.append(createTableCell('th', text)))
    thead.append(headerRow)

    const tbody = document.createElement('tbody')
    ;[
      ['Cell 1', 'Cell 2', 'Cell 3'],
      ['Cell 4', 'Cell 5', 'Cell 6']
    ].forEach(row => {
      const tr = document.createElement('tr')
      row.forEach(text => tr.append(createTableCell('td', text)))
      tbody.append(tr)
    })

    table.append(thead, tbody)
    return table
  }

  const getSelectedTableContext = () => {
    const cell = selectedCellRef.current ?? getCellFromSelection()
    const row = cell?.parentElement
    const table = cell?.closest('table')
    if (!cell || !(row instanceof HTMLTableRowElement) || !(table instanceof HTMLTableElement)) return null
    return { cell, row, table, colIndex: getCellColumnIndex(cell) }
  }

  const finishTableEdit = (cellToSelect?: HTMLTableCellElement | null) => {
    syncContent()
    const nextCell = cellToSelect ?? selectedCellRef.current
    if (nextCell?.isConnected) {
      const range = document.createRange()
      range.selectNodeContents(nextCell)
      range.collapse(false)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      saveSelection()
      selectTableCell(nextCell)
    } else {
      clearTableSelection()
    }
  }

  const insertTableRow = (position: 'before' | 'after') => {
    const context = getSelectedTableContext()
    if (!context) return

    const { row, colIndex } = context
    const section = row.parentElement
    const cellTag = section?.tagName === 'THEAD' ? 'th' : 'td'
    const newRow = document.createElement('tr')
    Array.from(row.cells).forEach(cell => {
      const newCell = createTableCell(cellTag.toLowerCase() as 'td' | 'th')
      newCell.style.width = (cell as HTMLElement).style.width
      newCell.style.minWidth = (cell as HTMLElement).style.minWidth
      newRow.append(newCell)
    })

    row[position === 'before' ? 'before' : 'after'](newRow)
    finishTableEdit(newRow.cells[Math.max(0, colIndex)] as HTMLTableCellElement | undefined)
  }

  const insertTableColumn = (position: 'before' | 'after') => {
    const context = getSelectedTableContext()
    if (!context) return

    const { table, colIndex } = context
    const insertIndex = position === 'before' ? colIndex : colIndex + 1
    let selectedCell: HTMLTableCellElement | null = null

    Array.from(table.rows).forEach(row => {
      const referenceCell = row.cells[insertIndex] ?? null
      const cellTag = row.parentElement?.tagName === 'THEAD' ? 'th' : 'td'
      const newCell = createTableCell(cellTag.toLowerCase() as 'td' | 'th')
      if (referenceCell) {
        row.insertBefore(newCell, referenceCell)
      } else {
        row.append(newCell)
      }
      if (row === context.row) selectedCell = newCell
    })

    finishTableEdit(selectedCell)
  }

  const deleteTableRow = () => {
    const context = getSelectedTableContext()
    if (!context) return

    const { row, table, colIndex } = context
    if (table.rows.length <= 1) {
      table.remove()
      syncContent()
      clearTableSelection()
      return
    }

    const nextRow = row.nextElementSibling instanceof HTMLTableRowElement
      ? row.nextElementSibling
      : row.previousElementSibling instanceof HTMLTableRowElement
        ? row.previousElementSibling
        : null
    row.remove()
    finishTableEdit(nextRow?.cells[Math.min(colIndex, (nextRow?.cells.length ?? 1) - 1)] as HTMLTableCellElement | undefined)
  }

  const deleteTableColumn = () => {
    const context = getSelectedTableContext()
    if (!context) return

    const { table, colIndex, row } = context
    const maxColumns = Math.max(...Array.from(table.rows).map(tableRow => tableRow.cells.length))
    if (maxColumns <= 1) {
      table.remove()
      syncContent()
      clearTableSelection()
      return
    }

    Array.from(table.rows).forEach(tableRow => tableRow.cells[colIndex]?.remove())
    finishTableEdit(row.cells[Math.min(colIndex, row.cells.length - 1)] as HTMLTableCellElement | undefined)
  }

  const deleteTable = () => {
    const context = getSelectedTableContext()
    if (!context) return
    const wrapper = context.table.closest<HTMLElement>('.table-scroll-wrapper')
    ;(wrapper ?? context.table).remove()
    syncContent()
    clearTableSelection()
  }

  const startColumnDragResize = (e: React.PointerEvent, cell: HTMLTableCellElement) => {
    const table = cell.closest('table')
    if (!(table instanceof HTMLTableElement)) return

    e.preventDefault()
    const colIndex = getCellColumnIndex(cell)
    const startX = e.clientX
    const startWidths = Array.from(table.rows).map(row => {
      const c = row.cells[colIndex]
      return c ? c.getBoundingClientRect().width : 0
    })

    colResizingRef.current = true
    const viewer = markdownViewerRef.current
    if (viewer) viewer.style.cursor = 'col-resize'

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      table.style.width = 'auto'
      Array.from(table.rows).forEach((row, i) => {
        const c = row.cells[colIndex] as HTMLElement | undefined
        if (!c) return
        const newWidth = Math.max(40, (startWidths[i] ?? 40) + delta)
        c.style.width = `${newWidth}px`
        c.style.minWidth = `${newWidth}px`
      })
    }

    const onUp = () => {
      colResizingRef.current = false
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (markdownViewerRef.current) markdownViewerRef.current.style.cursor = ''
      syncContent()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const startRowDragResize = (e: React.PointerEvent, cell: HTMLTableCellElement) => {
    const row = cell.parentElement
    if (!(row instanceof HTMLTableRowElement)) return

    e.preventDefault()
    const startY = e.clientY
    const startHeight = row.getBoundingClientRect().height

    rowResizingRef.current = true
    const viewer = markdownViewerRef.current
    if (viewer) viewer.style.cursor = 'row-resize'

    const onMove = (ev: PointerEvent) => {
      const newHeight = Math.max(28, startHeight + (ev.clientY - startY))
      row.style.height = `${newHeight}px`
      Array.from(row.cells).forEach(c => { (c as HTMLElement).style.height = `${newHeight}px` })
    }

    const onUp = () => {
      rowResizingRef.current = false
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (markdownViewerRef.current) markdownViewerRef.current.style.cursor = ''
      syncContent()
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const handleViewerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (colResizingRef.current || rowResizingRef.current) return
    const cell = (e.target as Element).closest?.('th, td')
    const viewer = markdownViewerRef.current
    if (!viewer) return
    if (cell instanceof HTMLTableCellElement) {
      const rect = cell.getBoundingClientRect()
      if (e.clientX >= rect.right - 8) {
        viewer.style.cursor = 'col-resize'
      } else if (e.clientY >= rect.bottom - 8) {
        viewer.style.cursor = 'row-resize'
      } else {
        viewer.style.cursor = ''
      }
    } else {
      viewer.style.cursor = ''
    }
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
      if (tableToolbarRef.current?.contains(document.activeElement)) { setDeletePos(null); return }
      if (!viewer || !sel || !sel.rangeCount) { setDeletePos(null); clearTableSelection(); return }
      const range = sel.getRangeAt(0)
      if (!viewer.contains(range.commonAncestorContainer)) { setDeletePos(null); clearTableSelection(); return }
      const cell = getCellFromSelection()
      if (cell) {
        savedRange.current = range.cloneRange()
        setDeletePos(null)
        selectTableCell(cell)
        return
      }
      clearTableSelection()
      if (sel.isCollapsed) { setDeletePos(null); return }
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
    decorateTables(viewer)

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
    decorateTables(viewer)
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
    decorateTables(viewer)
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

  const insertImages = (images: Array<{ src: string; alt?: string; width?: string }>) => {
    if (images.length === 0) return

    restoreSelection()
    const viewer = markdownViewerRef.current
    const selection = window.getSelection()
    if (!viewer || !selection) return

    let range = selection.rangeCount ? selection.getRangeAt(0) : null
    if (!range || !viewer.contains(range.commonAncestorContainer)) {
      range = document.createRange()
      range.selectNodeContents(viewer)
      range.collapse(false)
    }

    range.deleteContents()

    const selectedRow = range.startContainer instanceof Element
      ? range.startContainer.closest('p.image-row')
      : range.startContainer.parentElement?.closest('p.image-row')
    const imageRow = selectedRow instanceof HTMLParagraphElement && viewer.contains(selectedRow)
      ? selectedRow
      : document.createElement('p')

    imageRow.classList.add('image-row')

    const fragment = document.createDocumentFragment()
    const insertedImages = images.map(image => createImageElement(image.src, image.alt ?? '', image.width))
    insertedImages.forEach(image => fragment.append(image))

    if (imageRow.parentElement) {
      range.insertNode(fragment)
    } else {
      imageRow.append(fragment)
      range.insertNode(imageRow)
    }

    decorateImageRows(viewer)

    const nextRange = document.createRange()
    const lastInsertedImage = insertedImages.at(-1)
    if (lastInsertedImage?.isConnected) {
      nextRange.setStartAfter(lastInsertedImage)
    } else {
      nextRange.selectNodeContents(viewer)
      nextRange.collapse(false)
    }
    nextRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    saveSelection()
    syncContent()
  }

  const writeImageToClipboard = async (img: HTMLImageElement) => {
    const markdown = imageToMarkdown(img)
    const html = imageToHtml(
      img.getAttribute('src') ?? '',
      img.getAttribute('alt') ?? '',
      img.getAttribute('width') || img.style.width.replace('px', '') || undefined
    )

    if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([markdown], { type: 'text/plain' })
        })
      ])
    } else {
      await navigator.clipboard.writeText(markdown)
    }

    setImageCopied(true)
    setTimeout(() => setImageCopied(false), 2000)
  }

  const handleCopySelectedImage = async () => {
    const img = selectedImgRef.current
    if (!img) return
    await writeImageToClipboard(img)
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
    restoreSelection()
    const viewer = markdownViewerRef.current
    const selection = window.getSelection()
    if (!viewer || !selection) return

    let range = selection.rangeCount ? selection.getRangeAt(0) : null
    if (!range || !viewer.contains(range.commonAncestorContainer)) {
      range = document.createRange()
      range.selectNodeContents(viewer)
      range.collapse(false)
    }

    const table = createTable()
    const afterTable = document.createElement('p')
    afterTable.append(document.createElement('br'))
    range.deleteContents()
    range.insertNode(afterTable)
    range.insertNode(table)

    const firstCell = table.querySelector('th, td')
    if (firstCell instanceof HTMLTableCellElement) {
      const cellRange = document.createRange()
      cellRange.selectNodeContents(firstCell)
      selection.removeAllRanges()
      selection.addRange(cellRange)
      saveSelection()
      selectTableCell(firstCell)
    }

    syncContent()
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

  useEffect(() => {
    if (!tableSelection) return
    const viewer = markdownViewerRef.current
    const updateTableToolbar = () => {
      const cell = selectedCellRef.current
      if (cell?.isConnected) selectTableCell(cell)
    }
    viewer?.addEventListener('scroll', updateTableToolbar)
    window.addEventListener('resize', updateTableToolbar)
    return () => {
      viewer?.removeEventListener('scroll', updateTableToolbar)
      window.removeEventListener('resize', updateTableToolbar)
    }
  }, [tableSelection, markdownViewerRef])

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
        onMouseUp={() => {
          saveSelection()
          updateSelectedTableCell()
        }}
        onKeyUp={() => {
          saveSelection()
          updateSelectedTableCell()
        }}
        onPointerDown={editable ? (e) => {
          if (e.target instanceof HTMLImageElement) { handleImagePointerDown(e, e.target); return }
          const cell = (e.target as Element).closest?.('th, td')
          if (cell instanceof HTMLTableCellElement) {
            const rect = cell.getBoundingClientRect()
            if (e.clientX >= rect.right - 8) startColumnDragResize(e, cell)
            else if (e.clientY >= rect.bottom - 8) startRowDragResize(e, cell)
          }
        } : undefined}
        onMouseMove={editable ? handleViewerMouseMove : undefined}
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
            updateSelectedTableCell()
          }
        }}
        onCopy={event => {
          if (!selectedImgRef.current) return
          event.preventDefault()
          event.clipboardData.setData('text/html', imageToHtml(
            selectedImgRef.current.getAttribute('src') ?? '',
            selectedImgRef.current.getAttribute('alt') ?? '',
            selectedImgRef.current.getAttribute('width') || selectedImgRef.current.style.width.replace('px', '') || undefined
          ))
          event.clipboardData.setData('text/plain', imageToMarkdown(selectedImgRef.current))
          setImageCopied(true)
          setTimeout(() => setImageCopied(false), 2000)
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
                insertImages([{ src: reader.result as string }])
              }
              reader.readAsDataURL(file)
              return
            }
          }

          const html = event.clipboardData.getData('text/html')
          const htmlImages = html ? extractImagesFromHtml(html) : []
          if (htmlImages.length > 0) {
            insertImages(htmlImages)
            return
          }

          const text = event.clipboardData.getData('text/plain')
          const markdownImages = extractMarkdownImages(text)
          if (markdownImages.length > 0 && containsOnlyImagesAsText(text)) {
            insertImages(markdownImages)
            return
          }

          if (isImageUrl(text.trim())) {
            insertImages([{ src: text.trim() }])
            return
          }

          document.execCommand('insertText', false, text)
          syncContent()
        }}
        onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c' && selectedImgRef.current) {
            event.preventDefault()
            void handleCopySelectedImage()
            return
          }
          if ((event.ctrlKey || event.metaKey) && ['b', 'i', 'z', 'y'].includes(event.key.toLowerCase())) {
            window.setTimeout(syncContent, 0)
          }
        }}
        className={`markdown-content flex-1 overflow-y-auto bg-surface-1 px-8 pb-8 pt-6 outline-none border-l-2 border-l-forest/20 shadow-[-2px_0_0_0_rgba(0,0,0,0.04)] ${
          editable ? 'cursor-text focus:ring-0 focus:border-l-forest/50' : ''
        }`}
        spellCheck={editable}
      />

      {tableSelection && editable && createPortal(
        <div
          ref={tableToolbarRef}
          style={{
            position: 'fixed',
            left: Math.max(8, Math.min(tableSelection.tableLeft, window.innerWidth - 580)),
            top: tableSelection.tableTop,
            transform: 'translateY(-100%)',
            width: Math.min(tableSelection.tableWidth, window.innerWidth - 16),
            zIndex: 210
          }}
          className="flex items-center gap-1 bg-surface-2 border border-line border-b-0 rounded-t-lg px-2 py-1.5 select-none text-xs overflow-x-auto"
        >
          {/* Context label */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-line shrink-0">
            <Table2 className="w-3.5 h-3.5 text-forest" />
            <span className="text-forest font-medium tracking-wide uppercase" style={{ fontSize: '10px' }}>Table</span>
          </div>

          {/* Insert row */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-line shrink-0">
            <Rows3 className="w-3.5 h-3.5 text-forest shrink-0" />
            <button
              type="button"
              title="Insert row above"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertTableRow('before')}
              className="px-1.5 py-0.5 text-ink-2 hover:bg-surface-2 rounded cursor-pointer whitespace-nowrap"
            >
              Row above
            </button>
            <button
              type="button"
              title="Insert row below"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertTableRow('after')}
              className="px-1.5 py-0.5 text-ink-2 hover:bg-surface-2 rounded cursor-pointer whitespace-nowrap"
            >
              Row below
            </button>
          </div>

          {/* Insert column */}
          <div className="flex items-center gap-0.5 pr-1.5 border-r border-line shrink-0">
            <Columns3 className="w-3.5 h-3.5 text-forest shrink-0" />
            <button
              type="button"
              title="Insert column to the left"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertTableColumn('before')}
              className="px-1.5 py-0.5 text-ink-2 hover:bg-surface-2 rounded cursor-pointer whitespace-nowrap"
            >
              Col left
            </button>
            <button
              type="button"
              title="Insert column to the right"
              onMouseDown={e => e.preventDefault()}
              onClick={() => insertTableColumn('after')}
              className="px-1.5 py-0.5 text-ink-2 hover:bg-surface-2 rounded cursor-pointer whitespace-nowrap"
            >
              Col right
            </button>
          </div>

          {/* Delete actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            <Trash2 className="w-3 h-3 text-crimson shrink-0" />
            <button
              type="button"
              title="Delete this row"
              onMouseDown={e => e.preventDefault()}
              onClick={deleteTableRow}
              className="px-1.5 py-0.5 text-crimson hover:bg-crimson/10 rounded cursor-pointer whitespace-nowrap"
            >
              Row
            </button>
            <button
              type="button"
              title="Delete this column"
              onMouseDown={e => e.preventDefault()}
              onClick={deleteTableColumn}
              className="px-1.5 py-0.5 text-crimson hover:bg-crimson/10 rounded cursor-pointer whitespace-nowrap"
            >
              Column
            </button>
            <button
              type="button"
              title="Delete entire table"
              onMouseDown={e => e.preventDefault()}
              onClick={deleteTable}
              className="px-1.5 py-0.5 text-crimson hover:bg-crimson/10 rounded cursor-pointer whitespace-nowrap"
            >
              Table
            </button>
          </div>
        </div>,
        document.body
      )}

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
            <button
              className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-ink-2 hover:bg-surface-2 rounded cursor-pointer transition-colors"
              title="Copy image"
              onMouseDown={e => e.preventDefault()}
              onClick={handleCopySelectedImage}
            >
              {imageCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              Copy
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
