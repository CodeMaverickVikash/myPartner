import { useState, useEffect, useRef } from 'react'
import Sidebar from './components/Sidebar'
import Content from './components/Content'
import { loadFromLocalStorage, saveToLocalStorage } from './utils/storage'
import { openFileFromSystem, saveToFileHandle, isFileSystemAccessSupported, watchFile } from './utils/fileSystem'
import './App.css'

function App() {
  const [files, setFiles] = useState(new Map())
  const [currentFileId, setCurrentFileId] = useState(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [fileHandles, setFileHandles] = useState(new Map()) // Store file handles for direct saving
  const [fileModifiedTimes, setFileModifiedTimes] = useState(new Map()) // Track last modified times
  const watchersRef = useRef(new Map()) // Store file watchers

  // Load files from localStorage on mount
  useEffect(() => {
    const savedFiles = loadFromLocalStorage('uploadedFiles')
    if (savedFiles && savedFiles.length > 0) {
      const filesMap = new Map()
      savedFiles.forEach(file => {
        filesMap.set(file.id, file)
      })
      setFiles(filesMap)
    }
  }, [])

  // Save files to localStorage whenever they change
  useEffect(() => {
    if (files.size > 0) {
      const filesArray = Array.from(files.values())
      saveToLocalStorage('uploadedFiles', filesArray)
    }
  }, [files])

  const handleFileUpload = (uploadedFiles) => {
    const newFiles = new Map(files)
    
    uploadedFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const fileData = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace('.md', '').replace('.markdown', ''),
          content: e.target.result,
          uploadedAt: new Date().toISOString()
        }
        
        newFiles.set(fileData.id, fileData)
        setFiles(new Map(newFiles))
        
        // Set as current file if it's the first one
        if (newFiles.size === 1) {
          setCurrentFileId(fileData.id)
        }
      }
      reader.readAsText(file)
    })
  }

  const handleFileRemove = (fileId) => {
    if (confirm('Are you sure you want to remove this file?')) {
      // Stop watching the file
      const watcher = watchersRef.current.get(fileId)
      if (watcher) {
        watcher() // Stop watching
        watchersRef.current.delete(fileId)
      }

      const newFiles = new Map(files)
      newFiles.delete(fileId)
      setFiles(newFiles)

      // Remove file handle
      const newHandles = new Map(fileHandles)
      newHandles.delete(fileId)
      setFileHandles(newHandles)

      // Remove modified time
      const newTimes = new Map(fileModifiedTimes)
      newTimes.delete(fileId)
      setFileModifiedTimes(newTimes)

      // Clear localStorage if no files left
      if (newFiles.size === 0) {
        localStorage.removeItem('uploadedFiles')
        setCurrentFileId(null)
      } else if (currentFileId === fileId) {
        // Set first file as current if we deleted the current file
        setCurrentFileId(newFiles.keys().next().value)
      }
    }
  }

  const handleFileUpdate = (fileId, newContent) => {
    const newFiles = new Map(files)
    const file = newFiles.get(fileId)
    if (file) {
      file.content = newContent
      file.updatedAt = new Date().toISOString()
      newFiles.set(fileId, file)
      setFiles(new Map(newFiles))
    }
  }

  // Handle external file changes
  const handleExternalFileChange = (fileId, newContent, newLastModified) => {
    // Update file content
    const newFiles = new Map(files)
    const file = newFiles.get(fileId)
    if (file) {
      file.content = newContent
      file.updatedAt = new Date().toISOString()
      newFiles.set(fileId, file)
      setFiles(newFiles)
    }

    // Update last modified time
    const newTimes = new Map(fileModifiedTimes)
    newTimes.set(fileId, newLastModified)
    setFileModifiedTimes(newTimes)

    // Show notification to user
    if (file) {
      alert(`File "${file.name}" was updated externally and has been reloaded.`)
    }
  }

  // Start watching system files for external changes
  useEffect(() => {
    // Start watching all system files
    fileHandles.forEach((fileHandle, fileId) => {
      const file = files.get(fileId)
      if (file && file.isSystemFile) {
        const lastModified = fileModifiedTimes.get(fileId) || Date.now()

        // Stop existing watcher if any
        const existingWatcher = watchersRef.current.get(fileId)
        if (existingWatcher) existingWatcher()

        // Start new watcher
        const stopWatcher = watchFile(
          fileHandle,
          lastModified,
          (newContent, newLastModified) => {
            handleExternalFileChange(fileId, newContent, newLastModified)
          },
          2000 // Check every 2 seconds
        )

        watchersRef.current.set(fileId, stopWatcher)
      }
    })

    // Cleanup on unmount
    return () => {
      watchersRef.current.forEach(stopWatcher => stopWatcher())
      watchersRef.current.clear()
    }
  }, [fileHandles, files, fileModifiedTimes])

  // Open file from system using File System Access API
  const handleOpenFromSystem = async () => {
    if (!isFileSystemAccessSupported()) {
      alert('Your browser does not support direct file system access. Please use Chrome, Edge, or Opera.')
      return
    }

    try {
      const result = await openFileFromSystem()
      if (!result) return // User cancelled

      const { fileHandle, file, content, name } = result

      const fileData = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: name.replace('.md', '').replace('.markdown', ''),
        content,
        uploadedAt: new Date().toISOString(),
        isSystemFile: true // Mark as system file
      }

      const newFiles = new Map(files)
      newFiles.set(fileData.id, fileData)
      setFiles(newFiles)

      // Store file handle
      const newHandles = new Map(fileHandles)
      newHandles.set(fileData.id, fileHandle)
      setFileHandles(newHandles)

      // Store initial lastModified time
      const newTimes = new Map(fileModifiedTimes)
      newTimes.set(fileData.id, file.lastModified)
      setFileModifiedTimes(newTimes)

      setCurrentFileId(fileData.id)
    } catch (err) {
      console.error('Error opening file:', err)
      alert('Failed to open file: ' + err.message)
    }
  }

  // Save directly to system file
  const handleSaveToSystem = async (fileId) => {
    const fileHandle = fileHandles.get(fileId)
    const file = files.get(fileId)

    if (!fileHandle || !file) {
      alert('Cannot save: File handle not found')
      return
    }

    try {
      await saveToFileHandle(fileHandle, file.content)
      alert('File saved successfully!')
    } catch (err) {
      console.error('Error saving file:', err)
      alert('Failed to save file: ' + err.message)
    }
  }

  const currentFile = currentFileId ? files.get(currentFileId) : null
  const currentFileHandle = currentFileId ? fileHandles.get(currentFileId) : null

  return (
    <div className="app-container">
      <Sidebar
        files={files}
        currentFileId={currentFileId}
        onFileSelect={setCurrentFileId}
        onFileRemove={handleFileRemove}
        onFileUpload={handleFileUpload}
        onOpenFromSystem={handleOpenFromSystem}
        visible={sidebarVisible}
      />
      <Content
        file={currentFile}
        fileHandle={currentFileHandle}
        onFileUpdate={handleFileUpdate}
        onSaveToSystem={handleSaveToSystem}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        sidebarVisible={sidebarVisible}
      />
    </div>
  )
}

export default App

