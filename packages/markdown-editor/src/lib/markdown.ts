import { marked } from 'marked'
import hljs from 'highlight.js'
import type { Heading } from '../types'

marked.setOptions({
  highlight(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (error) {
        console.error('Highlight error:', error)
      }
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
} as Parameters<typeof marked.setOptions>[0] & {
  highlight: (code: string, lang: string) => string
})

export const parseMarkdown = (content: string) => {
  return marked.parse(content || '', { async: false }) as string
}

export const extractHeadings = (content: string, level = 2): Heading[] => {
  const headingRegex = new RegExp(`^#{${level}}\\s+(.+)$`, 'gm')
  const headings: Heading[] = []
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[1].trim()
    headings.push({
      text,
      id: text.toLowerCase().replace(/[^\w]+/g, '-')
    })
  }

  return headings
}

export const downloadMarkdown = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
