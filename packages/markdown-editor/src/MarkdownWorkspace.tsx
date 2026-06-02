import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from '@markdown-viewer/common/dependencies'
import Sidebar from './components/Sidebar'
import Content from './components/Content'
import { loadFromLocalStorage, saveToLocalStorage } from './lib/storage'
import { demoFile, DEMO_FILE_ID } from './lib/demo'
import { openFileFromSystem, saveToFileHandle, isFileSystemAccessSupported, watchFile } from './lib/file-system'
import { getAllFileHandles, removeFileHandle, saveFileHandle } from './lib/indexed-db'
import type { MarkdownFile } from './types'

type FileMap = Map<string, MarkdownFile>
type FileHandleMap = Map<string, FileSystemFileHandle>
type WatcherMap = Map<string, () => void>

function MarkdownWorkspace({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [files, setFiles] = useState<FileMap>(new Map())
  const [currentFileId, setCurrentFileId] = useState<string | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  ))
  const [fileHandles, setFileHandles] = useState<FileHandleMap>(new Map())
  const [fileModifiedTimes, setFileModifiedTimes] = useState<Map<string, number>>(new Map())
  const watchersRef = useRef<WatcherMap>(new Map())
  const isDirtyRef = useRef(false)

  const handleFileSelect = (newFileId: string) => {
    if (isDirtyRef.current && newFileId !== currentFileId) {
      if (!confirm('You have unsaved changes. Discard and switch file?')) return
      isDirtyRef.current = false
    }
    setCurrentFileId(newFileId)
  }

  useEffect(() => {
    const loadData = async () => {
      const savedFiles = loadFromLocalStorage<MarkdownFile[]>('uploadedFiles')

      if (savedFiles && savedFiles.length > 0) {
        const filesMap: FileMap = new Map()
        savedFiles.forEach(file => {
          filesMap.set(file.id, file)
        })
        setFiles(filesMap)

        // Restore selected file, default to demo if present
        const savedId = localStorage.getItem('markdown-current-file-id')
        const resolvedId = savedId && filesMap.has(savedId)
          ? savedId
          : filesMap.has(DEMO_FILE_ID)
            ? DEMO_FILE_ID
            : (filesMap.keys().next().value ?? null)
        setCurrentFileId(resolvedId)

        const handles = await getAllFileHandles()
        setFileHandles(handles)

        const modifiedTimes = new Map<string, number>()
        for (const [fileId, handle] of handles.entries()) {
          try {
            const file = await handle.getFile()
            modifiedTimes.set(fileId, file.lastModified)
          } catch (error) {
            console.error(`Error accessing file handle for ${fileId}:`, error)
          }
        }
        setFileModifiedTimes(modifiedTimes)
      } else {
        const seed: FileMap = new Map([[demoFile.id, demoFile]])
        setFiles(seed)
        setCurrentFileId(demoFile.id)
      }
    }

    void loadData()
  }, [])

  useEffect(() => {
    if (files.size > 0) {
      saveToLocalStorage('uploadedFiles', Array.from(files.values()))
    }
  }, [files])

  useEffect(() => {
    if (currentFileId) {
      localStorage.setItem('markdown-current-file-id', currentFileId)
    }
  }, [currentFileId])

  const handleFileRemove = async (fileId: string) => {
    if (!confirm('Are you sure you want to remove this file?')) return

    const watcher = watchersRef.current.get(fileId)
    if (watcher) {
      watcher()
      watchersRef.current.delete(fileId)
    }

    const newFiles = new Map(files)
    newFiles.delete(fileId)
    setFiles(newFiles)

    const newHandles = new Map(fileHandles)
    newHandles.delete(fileId)
    setFileHandles(newHandles)

    await removeFileHandle(fileId)

    const newTimes = new Map(fileModifiedTimes)
    newTimes.delete(fileId)
    setFileModifiedTimes(newTimes)

    if (newFiles.size === 0) {
      localStorage.removeItem('uploadedFiles')
      setCurrentFileId(null)
    } else if (currentFileId === fileId) {
      setCurrentFileId(newFiles.keys().next().value ?? null)
    }
  }

  const handleFileUpdate = (fileId: string, newContent: string) => {
    const file = files.get(fileId)
    if (!file) return

    setFiles(new Map(files).set(fileId, {
      ...file,
      content: newContent,
      updatedAt: new Date().toISOString()
    }))
  }

  const handleExternalFileChange = useCallback((fileId: string, newContent: string, newLastModified: number) => {
    const file = files.get(fileId)

    if (file) {
      setFiles(new Map(files).set(fileId, {
        ...file,
        content: newContent,
        updatedAt: new Date().toISOString()
      }))
    }

    setFileModifiedTimes(new Map(fileModifiedTimes).set(fileId, newLastModified))

    if (file) {
      toast.success(`File "${file.name}" was updated externally and has been reloaded.`, {
        duration: 4000,
        icon: 'Reloaded'
      })
    }
  }, [files, fileModifiedTimes])

  useEffect(() => {
    const watchers = watchersRef.current

    fileHandles.forEach((fileHandle, fileId) => {
      const file = files.get(fileId)
      if (file && file.isSystemFile) {
        const lastModified = fileModifiedTimes.get(fileId) ?? Date.now()

        const existingWatcher = watchers.get(fileId)
        if (existingWatcher) existingWatcher()

        const stopWatcher = watchFile(
          fileHandle,
          lastModified,
          (newContent, newLastModified) => {
            handleExternalFileChange(fileId, newContent, newLastModified)
          },
          2000
        )

        watchers.set(fileId, stopWatcher)
      }
    })

    return () => {
      watchers.forEach(stopWatcher => stopWatcher())
      watchers.clear()
    }
  }, [fileHandles, files, fileModifiedTimes, handleExternalFileChange])

  const handleOpenFromSystem = async () => {
    if (!isFileSystemAccessSupported()) {
      toast.error('Your browser does not support direct file system access. Please use Chrome, Edge, or Opera.', {
        duration: 5000
      })
      return
    }

    try {
      const result = await openFileFromSystem()
      if (!result) return

      const { fileHandle, file, content, name, path } = result

      const fileData: MarkdownFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: name.replace('.md', '').replace('.markdown', ''),
        content,
        uploadedAt: new Date().toISOString(),
        isSystemFile: true,
        filePath: path
      }

      setFiles(new Map(files).set(fileData.id, fileData))
      setFileHandles(new Map(fileHandles).set(fileData.id, fileHandle))
      await saveFileHandle(fileData.id, fileHandle)
      setFileModifiedTimes(new Map(fileModifiedTimes).set(fileData.id, file.lastModified))
      setCurrentFileId(fileData.id)

      toast.success(`File "${fileData.name}" opened successfully!`, {
        duration: 3000,
        icon: 'Opened'
      })
    } catch (err) {
      console.error('Error opening file:', err)
      toast.error(`Failed to open file: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        duration: 4000
      })
    }
  }

  const handleSaveToSystem = async (fileId: string, contentOverride?: string) => {
    const fileHandle = fileHandles.get(fileId)
    const file = files.get(fileId)

    if (!fileHandle || !file) {
      toast.error('Cannot save: File handle not found', {
        duration: 3000
      })
      return
    }

    try {
      const contentToSave = contentOverride ?? file.content
      await saveToFileHandle(fileHandle, contentToSave)

      if (contentOverride !== undefined && contentOverride !== file.content) {
        setFiles(new Map(files).set(fileId, {
          ...file,
          content: contentOverride,
          updatedAt: new Date().toISOString()
        }))
      }

      toast.success(`File "${file.name}" saved successfully!`, {
        duration: 3000,
        icon: 'Saved'
      })
    } catch (err) {
      console.error('Error saving file:', err)
      toast.error(`Failed to save file: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        duration: 4000
      })
    }
  }

  const currentFile = currentFileId ? files.get(currentFileId) ?? null : null
  const currentFileHandle = currentFileId ? fileHandles.get(currentFileId) ?? null : null

  return (
    <div className="app-container flex min-h-0 flex-1 overflow-hidden">
      <Sidebar
        files={files}
        currentFileId={currentFileId}
        onNavigate={onNavigate}
        onFileSelect={handleFileSelect}
        onFileRemove={handleFileRemove}
        onOpenFromSystem={handleOpenFromSystem}
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
      />
      <Content
        file={currentFile}
        fileHandle={currentFileHandle}
        onFileUpdate={handleFileUpdate}
        onSaveToSystem={handleSaveToSystem}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
        sidebarVisible={sidebarVisible}
        onDirtyChange={(d) => { isDirtyRef.current = d }}
      />
    </div>
  )
}

export default MarkdownWorkspace
