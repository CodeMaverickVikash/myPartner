import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Content from './components/Content'
import { loadFromLocalStorage, saveToLocalStorage } from './utils/storage'
import './App.css'

function App() {
  const [files, setFiles] = useState(new Map())
  const [currentFileId, setCurrentFileId] = useState(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)

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
      const newFiles = new Map(files)
      newFiles.delete(fileId)
      setFiles(newFiles)
      
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

  const currentFile = currentFileId ? files.get(currentFileId) : null

  return (
    <div className="app-container">
      <Sidebar
        files={files}
        currentFileId={currentFileId}
        onFileSelect={setCurrentFileId}
        onFileRemove={handleFileRemove}
        onFileUpload={handleFileUpload}
        visible={sidebarVisible}
      />
      <Content
        file={currentFile}
        onFileUpdate={handleFileUpdate}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        sidebarVisible={sidebarVisible}
      />
    </div>
  )
}

export default App

