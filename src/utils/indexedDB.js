// IndexedDB utilities for storing file handles persistently

const DB_NAME = 'MarkdownViewerDB'
const DB_VERSION = 1
const STORE_NAME = 'fileHandles'

// Open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileId' })
      }
    }
  })
}

// Save file handle to IndexedDB
export const saveFileHandle = async (fileId, fileHandle) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.put({ fileId, fileHandle })
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('Error saving file handle:', error)
    throw error
  }
}

// Get file handle from IndexedDB
export const getFileHandle = async (fileId) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(fileId)
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.fileHandle)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting file handle:', error)
    return null
  }
}

// Get all file handles from IndexedDB
export const getAllFileHandles = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result || []
        const handlesMap = new Map()
        results.forEach(item => {
          handlesMap.set(item.fileId, item.fileHandle)
        })
        resolve(handlesMap)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting all file handles:', error)
    return new Map()
  }
}

// Remove file handle from IndexedDB
export const removeFileHandle = async (fileId) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.delete(fileId)
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('Error removing file handle:', error)
    throw error
  }
}

// Clear all file handles from IndexedDB
export const clearAllFileHandles = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    
    await store.clear()
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (error) {
    console.error('Error clearing file handles:', error)
    throw error
  }
}

