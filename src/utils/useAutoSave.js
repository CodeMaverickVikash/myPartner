import { useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { projectManager } from '../utils/projectManager'

/**
 * Hook to handle auto-save functionality
 * Saves files when:
 * 1. Window loses focus (blur event)
 * 2. After specified inactivity timeout
 */
export const useAutoSave = (fileId, options = {}) => {
  const {
    onFocusBlur = true, // Save on window blur
    inactivityDelay = 2000, // Save after 2s of no input
    onError = null,
    onSuccess = null
  } = options

  const inactivityTimerRef = useRef(null)

  /**
   * Save the current file
   */
  const saveFile = useCallback(async () => {
    if (!fileId) return

    try {
      const fileData = projectManager.getFile(fileId)
      if (!fileData || fileData.saved) return

      await projectManager.saveFile(fileId)
      
      if (onSuccess) {
        onSuccess(fileData)
      }

      return true
    } catch (error) {
      console.error('Auto-save failed:', error)
      
      if (onError) {
        onError(error)
      } else {
        toast.error('Failed to auto-save file', { duration: 2000 })
      }

      return false
    }
  }, [fileId, onError, onSuccess])

  /**
   * Handle content change with inactivity-based debounce
   */
  const handleContentChange = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Set new timer for inactivity-based save
    inactivityTimerRef.current = setTimeout(() => {
      saveFile()
    }, inactivityDelay)
  }, [inactivityDelay, saveFile])

  /**
   * Handle window focus loss (blur event)
   */
  useEffect(() => {
    if (!onFocusBlur) return

    const handleWindowBlur = () => {
      saveFile()
    }

    window.addEventListener('blur', handleWindowBlur)

    return () => {
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [onFocusBlur, saveFile])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [])

  return {
    saveFile,
    handleContentChange
  }
}

/**
 * Hook to auto-save all unsaved files in a project
 * Useful for saving all files when closing the project or app
 */
export const useAutoSaveProject = (projectId, options = {}) => {
  const {
    onError = null,
    onSuccess = null
  } = options

  const saveAllFiles = useCallback(async () => {
    if (!projectId) return

    try {
      const result = await projectManager.saveAllProjectFiles(projectId)
      
      if (onSuccess) {
        onSuccess(result)
      }

      if (result.failed > 0) {
        toast.error(`Failed to save ${result.failed} file(s)`, { duration: 2000 })
      } else if (result.successful > 0) {
        toast.success(`Saved ${result.successful} file(s)`, { duration: 1500 })
      }

      return result
    } catch (error) {
      console.error('Failed to save project files:', error)
      
      if (onError) {
        onError(error)
      } else {
        toast.error('Failed to save project files', { duration: 2000 })
      }

      return null
    }
  }, [projectId, onError, onSuccess])

  /**
   * Save on window beforeunload (before page closes)
   */
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      const unsavedFiles = projectManager.getUnsavedFiles()
      if (unsavedFiles.length > 0) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Save them before leaving?'
        await saveAllFiles()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveAllFiles])

  return { saveAllFiles }
}

/**
 * Hook to listen for file changes in project manager
 */
export const useProjectManagerListener = (fileId, eventType, callback) => {
  useEffect(() => {
    const unsubscribe = projectManager.on(eventType, (data) => {
      if (eventType === 'fileSaved' && data.id === fileId) {
        callback(data)
      } else if (eventType !== 'fileSaved') {
        callback(data)
      }
    })

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [fileId, eventType, callback])
}
