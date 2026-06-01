export interface OpenFileResult {
  fileHandle: FileSystemFileHandle
  file: File
  content: string
  name: string
  path: string
}

export interface FileModificationResult {
  modified: boolean
  newContent: string | null
  lastModified: number
}

export const isFileSystemAccessSupported = () => {
  if (typeof window === 'undefined') return false
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
}

export const getFilePath = async (fileHandle: FileSystemFileHandle, file: File) => {
  try {
    if (file.webkitRelativePath) {
      return file.webkitRelativePath
    }

    if (fileHandle.name) {
      return fileHandle.name
    }

    return file.name || 'Unknown location'
  } catch {
    return 'Unknown location'
  }
}

export const openFileFromSystem = async (): Promise<OpenFileResult | null> => {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Markdown Files',
          accept: {
            'text/markdown': ['.md', '.markdown'],
            'text/plain': ['.txt']
          }
        }
      ],
      multiple: false
    })

    const file = await fileHandle.getFile()
    const content = await file.text()
    const path = await getFilePath(fileHandle, file)

    return {
      fileHandle,
      file,
      content,
      name: file.name,
      path
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null
    }
    throw err
  }
}

export const saveToFileHandle = async (fileHandle: FileSystemFileHandle, content: string) => {
  try {
    const permission = await fileHandle.requestPermission({ mode: 'readwrite' })

    if (permission !== 'granted') {
      throw new Error('Permission to write file was denied')
    }

    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()

    return true
  } catch (err) {
    console.error('Error saving file:', err)
    throw err
  }
}

export const saveAsNewFile = async (content: string, suggestedName = 'document.md') => {
  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'Markdown Files',
          accept: {
            'text/markdown': ['.md', '.markdown']
          }
        }
      ]
    })

    await saveToFileHandle(fileHandle, content)
    return fileHandle
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null
    }
    throw err
  }
}

export const checkFileModified = async (
  fileHandle: FileSystemFileHandle,
  lastModified: number
): Promise<FileModificationResult> => {
  try {
    const file = await fileHandle.getFile()
    const fileLastModified = file.lastModified

    if (fileLastModified > lastModified) {
      const newContent = await file.text()
      return {
        modified: true,
        newContent,
        lastModified: fileLastModified
      }
    }

    return {
      modified: false,
      newContent: null,
      lastModified
    }
  } catch (err) {
    console.error('Error checking file modification:', err)
    return {
      modified: false,
      newContent: null,
      lastModified
    }
  }
}

export const watchFile = (
  fileHandle: FileSystemFileHandle,
  lastModified: number,
  onFileChanged: (newContent: string, lastModified: number) => void,
  interval = 2000
) => {
  const intervalId = window.setInterval(async () => {
    const result = await checkFileModified(fileHandle, lastModified)
    if (result.modified && result.newContent !== null) {
      onFileChanged(result.newContent, result.lastModified)
    }
  }, interval)

  return () => window.clearInterval(intervalId)
}
