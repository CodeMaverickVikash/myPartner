import { BookOpen, FileText, X, FolderOpen, Folder, Link } from 'lucide-react'
import { extractHeadings } from '../lib/markdown'
import { isFileSystemAccessSupported } from '../lib/file-system'
import type { MarkdownFile } from '../types'

function displayPath(file: { name: string; filePath?: string }): string {
  if (!file.filePath) return `${file.name}.md`
  const parts = file.filePath.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts.length >= 2 ? parts.slice(-2).join('/') : parts.join('/')
}

interface SidebarProps {
  files: Map<string, MarkdownFile>
  currentFileId: string | null
  onFileSelect: (fileId: string) => void
  onFileRemove: (fileId: string) => void
  onOpenFromSystem: () => void
  visible: boolean
  onClose?: () => void
}

function Sidebar({
  files,
  currentFileId,
  onFileSelect,
  onFileRemove,
  onOpenFromSystem,
  visible,
  onClose,
}: SidebarProps) {
  const filteredFiles = Array.from(files.values())

  return (
    <>
      {/* Mobile backdrop */}
      {visible && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside className={[
        'bg-surface-1 flex flex-col border-r border-line transition-all duration-300',
        // Mobile: fixed overlay drawer below the 56px topbar
        'fixed top-14 left-0 bottom-0 z-40 w-70',
        // Desktop: static push-content sidebar
        'md:static md:z-auto md:top-auto md:bottom-auto md:left-auto',
        visible
          ? 'translate-x-0 md:w-[320px]'
          : '-translate-x-full md:translate-x-0 md:w-0 md:min-w-0 md:overflow-hidden',
      ].join(' ')}>
      <div className="p-3 border-b border-line shrink-0 bg-surface-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-semibold text-ink-1 flex items-center gap-2 uppercase tracking-wider">
            <div className="w-6 h-6 bg-forest rounded flex items-center justify-center shadow-sm shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span>Markdown Editor</span>
          </h1>
          {isFileSystemAccessSupported() ? (
            <button
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-forest/10 text-forest border border-forest/30 rounded-md cursor-pointer text-xs font-medium transition-all duration-200 hover:bg-forest hover:text-white active:scale-95"
              onClick={onOpenFromSystem}
              title="Open file from your computer"
            >
              <Folder className="w-3.5 h-3.5" />
              Open File
            </button>
          ) : (
            <p className="text-[10px] text-crimson">Chrome/Edge required for file access</p>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1.5 px-2">
        {filteredFiles.length > 0 ? (
          <div>
            <h3 className="px-2 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Files ({filteredFiles.length})</h3>
            <ul className="list-none space-y-0.5">
              {filteredFiles.map(file => {
                const headings = extractHeadings(file.content, 2)
                return (
                  <li key={file.id}>
                    <div
                      className={`group flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        currentFileId === file.id
                          ? 'bg-forest/10 border border-forest/30'
                          : 'hover:bg-surface-2 border border-transparent'
                      }`}
                      onClick={() => onFileSelect(file.id)}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                          currentFileId === file.id ? 'text-forest' : 'text-ink-3'
                        }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col gap-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${
                              currentFileId === file.id ? 'text-forest' : 'text-ink-2'
                            }`}>{file.name}</span>
                            {file.isSystemFile && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-forest/15 text-forest text-xs font-medium rounded shrink-0" title="Linked to system file">
                                <Link className="w-3 h-3" />
                                Synced
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ink-3 truncate leading-tight">{displayPath(file)}</span>
                        </div>
                      </span>
                      <button
                        className="p-1 hover:bg-crimson/10 text-ink-3 hover:text-crimson rounded transition-all duration-200 shrink-0 cursor-pointer opacity-0 group-hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation()
                          onFileRemove(file.id)
                        }}
                        title="Remove this file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {currentFileId === file.id && headings.length > 0 && (
                      <ul className="list-none pl-9 mt-0.5 mb-1 space-y-0.5">
                        {headings.map((heading, idx) => (
                          <li key={`${heading.id}-${idx}`}>
                            <a href={`#${heading.id}`} className="text-ink-3 no-underline text-xs transition-all duration-200 hover:text-forest hover:bg-forest/8 block py-1 px-2 rounded">{heading.text}</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-line rounded-lg mx-1 my-4 flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-surface-2 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-ink-3" />
            </div>
            <div>
              <p className="text-sm font-medium text-ink-2 mb-0.5">No files open</p>
              <p className="text-xs text-ink-3">Click "Open File" to begin</p>
            </div>
          </div>
        )}
      </nav>
    </aside>
    </>
  )
}

export default Sidebar
