import { useRef } from 'react'
import MarkdownViewer from './components/MarkdownViewer'

interface MarkdownPreviewEditorProps {
  value: string
  onChange?: (content: string) => void
}

// Thin wrapper that owns the ref; callers use `key={noteId}` to force remount on context switch.
export default function MarkdownPreviewEditor({ value, onChange }: MarkdownPreviewEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <MarkdownViewer
      content={value}
      markdownViewerRef={ref}
      onContentChange={onChange}
    />
  )
}
