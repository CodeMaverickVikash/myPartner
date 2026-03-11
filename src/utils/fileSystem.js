// File System Access API utilities

/**
 * Check if File System Access API is supported
 */
export const isFileSystemAccessSupported = () => {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
}

/**
 * Get file path from file handle and file object
 * Note: Full absolute path is not available for security reasons in browsers
 * We can only show the file name, but we'll try to get as much info as possible
 */
export const getFilePath = async (fileHandle, file) => {
  try {
    let path = ''

    // Try to get webkitRelativePath (for directory uploads)
    if (file && file.webkitRelativePath) {
      path = file.webkitRelativePath
    }
    // Try to get path from File System Access API (limited info)
    else if (fileHandle && fileHandle.name) {
      path = fileHandle.name
    }
    // Fallback to file name
    else if (file && file.name) {
      path = file.name
    }
    else {
      path = 'Unknown location'
    }

    return path
  } catch (err) {
    return 'Unknown location'
  }
}

/**
 * Open a file from the user's system
 * Returns: { fileHandle, file, content, name, path }
 */
export const openFileFromSystem = async () => {
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
    if (err.name === 'AbortError') {
      // User cancelled the picker
      return null
    }
    throw err
  }
}

/**
 * Save content directly to the file handle
 */
export const saveToFileHandle = async (fileHandle, content) => {
  try {
    // Request permission if needed
    const permission = await fileHandle.requestPermission({ mode: 'readwrite' })
    
    if (permission !== 'granted') {
      throw new Error('Permission to write file was denied')
    }

    // Create a writable stream
    const writable = await fileHandle.createWritable()
    
    // Write the content
    await writable.write(content)
    
    // Close the file
    await writable.close()

    return true
  } catch (err) {
    console.error('Error saving file:', err)
    throw err
  }
}

/**
 * Save as new file (prompts user for location)
 */
export const saveAsNewFile = async (content, suggestedName = 'document.md') => {
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
    if (err.name === 'AbortError') {
      // User cancelled
      return null
    }
    throw err
  }
}

/**
 * Check if file has been modified externally
 * Returns: { modified: boolean, newContent: string, lastModified: number }
 */
export const checkFileModified = async (fileHandle, lastModified) => {
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

/**
 * Start watching a file for external changes
 * Returns a cleanup function to stop watching
 */
export const watchFile = (fileHandle, lastModified, onFileChanged, interval = 2000) => {
  const intervalId = setInterval(async () => {
    const result = await checkFileModified(fileHandle, lastModified)
    if (result.modified) {
      onFileChanged(result.newContent, result.lastModified)
    }
  }, interval)

  // Return cleanup function
  return () => clearInterval(intervalId)
}

/**
 * Open a project/folder from the user's system
 * Returns: { directoryHandle, name }
 */
export const openProjectDirectory = async () => {
  try {
    const directoryHandle = await window.showDirectoryPicker()
    return {
      directoryHandle,
      name: directoryHandle.name,
      status: 'success'
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled the picker
      return null
    }
    console.error('Error opening project directory:', err)
    throw err
  }
}

/**
 * Read all files from a directory recursively
 * Returns: Array of { fileHandle, name, path, isDirectory }
 */
export const readDirectoryRecursive = async (directoryHandle, path = '') => {
  const entries = []
  
  try {
    for await (const entry of directoryHandle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name
      
      if (entry.kind === 'file') {
        entries.push({
          fileHandle: entry,
          name: entry.name,
          path: entryPath,
          isDirectory: false
        })
      } else if (entry.kind === 'directory') {
        entries.push({
          fileHandle: entry,
          name: entry.name,
          path: entryPath,
          isDirectory: true
        })
        // Recursively read subdirectories
        const subEntries = await readDirectoryRecursive(entry, entryPath)
        entries.push(...subEntries)
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err)
  }
  
  return entries
}

/**
 * Get file content from a file handle
 * Returns: { content, lastModified }
 */
export const readFileFromHandle = async (fileHandle) => {
  try {
    const file = await fileHandle.getFile()
    const content = await file.text()
    return {
      content,
      lastModified: file.lastModified,
      size: file.size
    }
  } catch (err) {
    console.error('Error reading file from handle:', err)
    throw err
  }
}

/**
 * Save content to a file handle with write permission
 */
export const saveFileToHandle = async (fileHandle, content) => {
  try {
    // Request write permission
    const permission = await fileHandle.requestPermission({ mode: 'readwrite' })
    
    if (permission !== 'granted') {
      throw new Error('Permission to write file was denied')
    }

    // Create a writable stream
    const writable = await fileHandle.createWritable()
    
    // Write the content
    await writable.write(content)
    
    // Close the file
    await writable.close()

    return {
      success: true,
      message: 'File saved successfully'
    }
  } catch (err) {
    console.error('Error saving file to handle:', err)
    throw err
  }
}

