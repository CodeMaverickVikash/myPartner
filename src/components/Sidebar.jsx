import { useRef } from 'react'
import { IoBook, IoCloudUpload, IoSearch, IoDocument, IoClose, IoFolderOpen, IoFolder } from 'react-icons/io5'
import { extractHeadings } from '../utils/markdown'
import { isFileSystemAccessSupported } from '../utils/fileSystem'

function Sidebar({
  files,
  currentFileId,
  onFileSelect,
  onFileRemove,
  onFileUpload,
  onOpenFromSystem,
  visible
}) {
  const fileInputRef = useRef(null)

  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length > 0) {
      onFileUpload(selectedFiles)
    }
    e.target.value = '' // Reset input
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.md') || file.name.endsWith('.markdown')
    )
    
    if (droppedFiles.length > 0) {
      onFileUpload(droppedFiles)
    }
  }

  const filteredFiles = Array.from(files.values());

  return (
    <aside className={`${visible ? 'w-[320px]' : 'w-0 min-w-0 overflow-hidden'} bg-white flex flex-col transition-all duration-300 border-r border-gray-200`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0 bg-white">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-indigo-500 rounded-lg flex items-center justify-center">
              <IoBook className="w-5 h-5 text-white" />
            </div>
            <span>Markdown Viewer</span>
          </h1>
          <p className="text-xs text-gray-600 ml-12">Professional documentation viewer</p>
        </div>
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileInputChange}
          />
          <button
            className="w-full px-4 py-2.5 bg-indigo-500 text-white rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-indigo-600 active:scale-95 flex items-center justify-center gap-2 shadow-sm"
            onClick={handleUploadClick}
            title="Upload markdown files"
          >
            <IoCloudUpload className="w-5 h-5" />
            Upload Files
          </button>
          {isFileSystemAccessSupported() && (
            <button
              className="w-full px-4 py-2.5 bg-green-500 text-white rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-green-600 active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              onClick={onOpenFromSystem}
              title="Open file from your computer (direct editing)"
            >
              <IoFolder className="w-5 h-5" />
              Open from System
            </button>
          )}
        </div>
      </div>

      {/* File List */}
      <nav className="flex-1 overflow-y-auto py-2 px-4">
        {filteredFiles.length > 0 ? (
          <div>
            <h3 className="px-2 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Files ({filteredFiles.length})</h3>
            <ul className="list-none space-y-1">
              {filteredFiles.map(file => {
                const headings = extractHeadings(file.content, 2)
                return (
                  <li key={file.id}>
                    <div
                      className={`group flex justify-between items-center px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                        currentFileId === file.id
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => onFileSelect(file.id)}
                    >
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                          currentFileId === file.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          <IoDocument className="w-4 h-4" />
                        </div>
                        <span className={`text-sm font-medium ${
                          currentFileId === file.id ? 'text-indigo-700' : 'text-gray-700'
                        }`}>{file.name}</span>
                      </span>
                      <button
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-md transition-all duration-200 shrink-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          onFileRemove(file.id)
                        }}
                        title="Remove this file"
                      >
                        <IoClose className="w-4 h-4" />
                      </button>
                    </div>
                    {currentFileId === file.id && headings.length > 0 && (
                      <ul className="list-none pl-10 mt-1 mb-1 space-y-0.5">
                        {headings.map((heading, idx) => (
                          <li key={idx}>
                            <a href={`#${heading.id}`} className="text-gray-600 no-underline text-xs font-medium transition-all duration-200 hover:text-indigo-600 hover:bg-indigo-50 block py-1.5 px-2.5 rounded-md">{heading.text}</a>
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
          <div
            className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg mx-2 my-4 transition-all duration-200 flex flex-col items-center gap-3 hover:border-indigo-400 hover:bg-gray-50"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <IoFolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">No files uploaded</p>
              <p className="text-xs text-gray-500">Drag & drop .md files here</p>
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar

