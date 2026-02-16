import { IoBook, IoDocument, IoClose, IoFolderOpen, IoFolder, IoLink } from 'react-icons/io5'
import { extractHeadings } from '../utils/markdown'
import { isFileSystemAccessSupported } from '../utils/fileSystem'

function Sidebar({
  files,
  currentFileId,
  onFileSelect,
  onFileRemove,
  onOpenFromSystem,
  visible
}) {

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
        <div>
          {isFileSystemAccessSupported() ? (
            <button
              className="w-full px-4 py-2.5 bg-indigo-500 text-white rounded-lg cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-indigo-600 active:scale-95 flex items-center justify-center gap-2 shadow-sm"
              onClick={onOpenFromSystem}
              title="Open file from your computer (direct editing)"
            >
              <IoFolder className="w-5 h-5" />
              Open File
            </button>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700 text-center">
                Your browser doesn't support direct file access. Please use Chrome, Edge, or Opera.
              </p>
            </div>
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
                        <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium truncate ${
                              currentFileId === file.id ? 'text-indigo-700' : 'text-gray-700'
                            }`}>{file.name}</span>
                            {file.isSystemFile && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded shrink-0" title="Linked to system file">
                                <IoLink className="w-3 h-3" />
                                System
                              </span>
                            )}
                          </div>
                        </div>
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
          <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg mx-2 my-4 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
              <IoFolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">No files opened</p>
              <p className="text-xs text-gray-500">Click "Open File" to get started</p>
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar

