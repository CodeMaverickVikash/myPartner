const DB_NAME = 'MarkdownViewerDB'
const DB_VERSION = 1
const STORE_NAME = 'fileHandles'

interface FileHandleRecord {
  fileId: string
  fileHandle: FileSystemFileHandle
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'fileId' })
      }
    }
  })
}

const waitForTransaction = (transaction: IDBTransaction): Promise<void> => {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export const saveFileHandle = async (fileId: string, fileHandle: FileSystemFileHandle) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    store.put({ fileId, fileHandle })
    await waitForTransaction(transaction)
  } catch (error) {
    console.error('Error saving file handle:', error)
    throw error
  }
}

export const getFileHandle = async (fileId: string): Promise<FileSystemFileHandle | null> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(fileId)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve((request.result as FileHandleRecord | undefined)?.fileHandle ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Error getting file handle:', error)
    return null
  }
}

export const getAllFileHandles = async (): Promise<Map<string, FileSystemFileHandle>> => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as FileHandleRecord[] | undefined
        const handlesMap = new Map<string, FileSystemFileHandle>()
        results?.forEach(item => {
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

export const removeFileHandle = async (fileId: string) => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    store.delete(fileId)
    await waitForTransaction(transaction)
  } catch (error) {
    console.error('Error removing file handle:', error)
    throw error
  }
}

export const clearAllFileHandles = async () => {
  try {
    const db = await openDB()
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    store.clear()
    await waitForTransaction(transaction)
  } catch (error) {
    console.error('Error clearing file handles:', error)
    throw error
  }
}
