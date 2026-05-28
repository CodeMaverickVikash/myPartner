import { useRef, useState } from 'react'
import { IoMenu, IoCreate, IoSave, IoClose, IoChevronUp, IoDocument, IoCheckmarkCircle, IoLink, IoFolderOpen } from 'react-icons/io5'
import MarkdownViewer from './MarkdownViewer'
import MarkdownEditor from './MarkdownEditor'
import WelcomeScreen from './WelcomeScreen'
import type { MarkdownFile } from '../types'

interface ContentProps {
  file: MarkdownFile | null
  fileHandle?: FileSystemFileHandle | null
  onFileUpdate: (fileId: string, content: string) => void
  onSaveToSystem: (fileId: string) => Promise<void>
  onToggleSidebar: () => void
  sidebarVisible: boolean
}

function Content({ file, fileHandle, onFileUpdate, onSaveToSystem, onToggleSidebar, sidebarVisible }: ContentProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [scrollPosition, setScrollPosition] = useState(0)
  const markdownViewerRef = useRef<HTMLDivElement | null>(null)

  const restoreScrollPosition = () => {
    setTimeout(() => {
      if (markdownViewerRef.current) {
        markdownViewerRef.current.scrollTop = scrollPosition
      }
    }, 0)
  }

  const handleEdit = () => {
    if (!file) return

    if (markdownViewerRef.current) {
      setScrollPosition(markdownViewerRef.current.scrollTop)
    }
    setEditContent(file.content)
    setIsEditMode(true)
  }

  const handleSave = () => {
    if (!file) return

    onFileUpdate(file.id, editContent)
    setIsEditMode(false)
    restoreScrollPosition()
  }

  const handleSaveToSystem = async () => {
    if (!file) return

    onFileUpdate(file.id, editContent)
    await onSaveToSystem(file.id)
    setIsEditMode(false)
    restoreScrollPosition()
  }

  const handleCancel = () => {
    setIsEditMode(false)
    setEditContent('')
    restoreScrollPosition()
  }

  const scrollToTop = () => {
    markdownViewerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {!file && (
        <button
          className={`flex items-center justify-center border border-sage cursor-pointer text-forest transition-all duration-200 p-2.5 w-10 h-10 rounded-lg fixed top-4 z-50 bg-white shadow-sm hover:bg-sage/20 hover:border-forest active:scale-95 ${sidebarVisible ? 'left-85' : 'left-4'}`}
          onClick={onToggleSidebar}
          title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <IoMenu className="w-5 h-5" />
        </button>
      )}

      {file ? (
        <>
          <div className="flex justify-between items-center px-10 py-4 bg-gradient-to-r from-cream/30 to-white border-b border-sage/30 gap-4 flex-wrap relative">
            <button
              className="flex items-center justify-center cursor-pointer text-forest transition-all duration-200 p-2 w-9 h-9 rounded-lg absolute left-4 top-1/2 -translate-y-1/2 hover:bg-sage/20 active:scale-95 border border-sage"
              onClick={onToggleSidebar}
              title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
            >
              <IoMenu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 ml-12">
              <div className="w-8 h-8 bg-forest rounded-lg flex items-center justify-center shrink-0">
                <IoDocument className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">{file.name}</span>
                  {file.isSystemFile && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-forest/20 text-forest text-xs font-medium rounded-md" title="Linked to system file - changes save directly">
                      <IoLink className="w-3.5 h-3.5" />
                      System File
                    </span>
                  )}
                </div>
                {file.filePath && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <IoFolderOpen className="w-3.5 h-3.5" />
                    <span
                      className="truncate max-w-md"
                      title={`File: ${file.filePath}\n\nNote: Full absolute path is not available due to browser security restrictions. This shows the filename only.`}
                    >
                      {file.filePath}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isEditMode ? (
                <button
                  className="px-4 py-2 bg-forest text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-forest/90 active:scale-95 flex items-center gap-2 shadow-sm"
                  onClick={handleEdit}
                  title="Edit markdown"
                >
                  <IoCreate className="w-4 h-4" />
                  Edit
                </button>
              ) : (
                <>
                  {fileHandle ? (
                    <button
                      className="px-4 py-2 bg-forest text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-forest/90 active:scale-95 flex items-center gap-2 shadow-sm"
                      onClick={handleSaveToSystem}
                      title="Save directly to system file"
                    >
                      <IoCheckmarkCircle className="w-4 h-4" />
                      Save to System
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-forest text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-forest/90 active:scale-95 flex items-center gap-2 shadow-sm"
                      onClick={handleSave}
                      title="Save changes"
                    >
                      <IoSave className="w-4 h-4" />
                      Save
                    </button>
                  )}
                  <button
                    className="px-4 py-2 bg-sage/40 text-gray-700 border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-sage/60 active:scale-95 flex items-center gap-2"
                    onClick={handleCancel}
                    title="Cancel editing"
                  >
                    <IoClose className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditMode ? (
            <MarkdownEditor
              content={editContent}
              onChange={setEditContent}
              initialScrollPosition={scrollPosition}
              onScrollChange={setScrollPosition}
            />
          ) : (
            <MarkdownViewer content={file.content} markdownViewerRef={markdownViewerRef} />
          )}

          <button
            className="fixed bottom-8 right-8 w-12 h-12 bg-forest text-white border-none rounded-lg cursor-pointer flex items-center justify-center shadow-lg transition-all duration-200 z-50 hover:bg-forest/90 hover:shadow-xl active:scale-95"
            onClick={scrollToTop}
            title="Scroll to top"
          >
            <IoChevronUp className="w-6 h-6" />
          </button>
        </>
      ) : (
        <WelcomeScreen />
      )}
    </main>
  )
}

export default Content
