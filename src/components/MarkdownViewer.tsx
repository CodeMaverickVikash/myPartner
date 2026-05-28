import { useEffect } from 'react'
import type { RefObject } from 'react'
import { parseMarkdown } from '../utils/markdown'

interface MarkdownViewerProps {
  content: string
  markdownViewerRef: RefObject<HTMLDivElement | null>
}

function MarkdownViewer({ content, markdownViewerRef }: MarkdownViewerProps) {
  useEffect(() => {
    if (markdownViewerRef.current) {
      markdownViewerRef.current.innerHTML = parseMarkdown(content)

      const headings = markdownViewerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
      headings.forEach(heading => {
        heading.id = (heading.textContent ?? '').toLowerCase().replace(/[^\w]+/g, '-')
      })
    }
  }, [content, markdownViewerRef])

  return (
    <div className="flex-1 overflow-y-auto px-8 py-12 bg-white markdown-content" ref={markdownViewerRef}>
      {/* Content will be rendered here */}
    </div>
  )
}

export default MarkdownViewer
