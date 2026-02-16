import { useState, useRef } from 'react'
import { IoMenu, IoCreate, IoSave, IoClose, IoChevronUp, IoDocument, IoCheckmarkCircle, IoLink } from 'react-icons/io5'
import MarkdownViewer from './MarkdownViewer'
import MarkdownEditor from './MarkdownEditor'
import WelcomeScreen from './WelcomeScreen'

function Content({ file, fileHandle, onFileUpdate, onSaveToSystem, onToggleSidebar, sidebarVisible }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editContent, setEditContent] = useState('')
  const markdownViewerRef = useRef(null);

  const handleEdit = () => {
    setEditContent(file.content)
    setIsEditMode(true)
  }

  const handleSave = () => {
    onFileUpdate(file.id, editContent)
    setIsEditMode(false)
  }

  const handleSaveToSystem = async () => {
    // First update the file in state
    onFileUpdate(file.id, editContent)
    // Then save to system
    await onSaveToSystem(file.id)
    setIsEditMode(false)
  }

  const handleCancel = () => {
    setIsEditMode(false)
    setEditContent('')
  }

  const scrollToTop = () => {
    markdownViewerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
      {/* Sidebar Toggle Button */}
      {!file && (
        <button
          className={`flex items-center justify-center border border-gray-300 cursor-pointer text-gray-700 transition-all duration-200 p-2.5 w-10 h-10 rounded-lg fixed top-4 z-50 bg-white shadow-sm hover:bg-gray-50 hover:border-indigo-500 active:scale-95 ${sidebarVisible ? 'left-85' : 'left-4'}`}
          onClick={onToggleSidebar}
          title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
        >
          <IoMenu className="w-5 h-5" />
        </button>
      )}

      {file ? (
        <>
          <div className="flex justify-between items-center px-10 py-4 bg-white border-b border-gray-200 gap-4 flex-wrap relative">
            {/* Sidebar Toggle Button - In Header */}
            <button
              className="flex items-center justify-center cursor-pointer text-gray-700 transition-all duration-200 p-2 w-9 h-9 rounded-lg absolute left-4 top-1/2 -translate-y-1/2 hover:bg-gray-100 active:scale-95 border border-gray-300"
              onClick={onToggleSidebar}
              title={sidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
            >
              <IoMenu className="w-5 h-5" />
            </button>

            <div className="text-lg font-semibold text-gray-900 flex items-center gap-2.5 ml-12">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <IoDocument className="w-4 h-4 text-white" />
              </div>
              <span>{file.name}</span>
              {file.isSystemFile && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-md" title="Linked to system file - changes save directly">
                  <IoLink className="w-3.5 h-3.5" />
                  System File
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {!isEditMode ? (
                <button
                  className="px-4 py-2 bg-indigo-500 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-indigo-600 active:scale-95 flex items-center gap-2 shadow-sm"
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
                      className="px-4 py-2 bg-green-500 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-green-600 active:scale-95 flex items-center gap-2 shadow-sm"
                      onClick={handleSaveToSystem}
                      title="Save directly to system file"
                    >
                      <IoCheckmarkCircle className="w-4 h-4" />
                      Save to System
                    </button>
                  ) : (
                    <button
                      className="px-4 py-2 bg-green-500 text-white border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-green-600 active:scale-95 flex items-center gap-2 shadow-sm"
                      onClick={handleSave}
                      title="Save changes"
                    >
                      <IoSave className="w-4 h-4" />
                      Save
                    </button>
                  )}
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-700 border-none rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-gray-300 active:scale-95 flex items-center gap-2"
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
            />
          ) : (
            <MarkdownViewer content={file.content} markdownViewerRef={markdownViewerRef} />
          )}

          {/* Scroll to Top Button - Only show when file is loaded */}
          <button
            className="fixed bottom-8 right-8 w-12 h-12 bg-indigo-500 text-white border-none rounded-lg cursor-pointer flex items-center justify-center shadow-lg transition-all duration-200 z-50 hover:bg-indigo-600 hover:shadow-xl active:scale-95"
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

