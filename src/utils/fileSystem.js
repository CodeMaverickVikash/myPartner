// File System Access API utilities

/**
 * Check if File System Access API is supported
 */
export const isFileSystemAccessSupported = () => {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window
}

/**
 * Open a file from the user's system
 * Returns: { fileHandle, file, content }
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

    return {
      fileHandle,
      file,
      content,
      name: file.name
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

