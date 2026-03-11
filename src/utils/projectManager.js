/**
 * Project Manager - Manages opened projects and their file handles
 * Stores file handles and tracks file metadata for direct system file editing
 */

class ProjectManager {
  constructor() {
    this.projects = {} // { projectId: { directoryHandle, name, files: {} } }
    this.openFiles = {} // { fileId: { fileHandle, projectId, path, content, saved, lastModified } }
    this.fileIdCounter = 0
    this.listeners = {
      fileAdded: [],
      fileRemoved: [],
      fileChanged: [],
      projectOpened: [],
      projectClosed: [],
      fileSaved: []
    }
  }

  /**
   * Open a project from a directory handle
   */
  async openProject(directoryHandle, projectName) {
    const projectId = `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const project = {
      id: projectId,
      directoryHandle,
      name: projectName || directoryHandle.name,
      files: {},
      createdAt: new Date()
    }

    this.projects[projectId] = project
    this.emit('projectOpened', project)

    return projectId
  }

  /**
   * Close a project
   */
  closeProject(projectId) {
    if (!this.projects[projectId]) return

    const project = this.projects[projectId]
    
    // Remove all files associated with this project
    Object.keys(this.openFiles).forEach(fileId => {
      if (this.openFiles[fileId].projectId === projectId) {
        delete this.openFiles[fileId]
      }
    })

    delete this.projects[projectId]
    this.emit('projectClosed', project)
  }

  /**
   * Add a file from a file handle
   */
  addFileFromHandle(projectId, fileHandle, relativePath, content, lastModified) {
    if (!this.projects[projectId]) {
      throw new Error(`Project ${projectId} not found`)
    }

    const fileId = `file_${this.fileIdCounter++}_${Date.now()}`

    const fileData = {
      id: fileId,
      fileHandle,
      projectId,
      path: relativePath,
      content,
      saved: true,
      lastModified,
      createdAt: new Date()
    }

    this.openFiles[fileId] = fileData
    this.projects[projectId].files[fileId] = fileId

    this.emit('fileAdded', fileData)

    return fileId
  }

  /**
   * Update file content
   */
  updateFileContent(fileId, content) {
    if (!this.openFiles[fileId]) {
      throw new Error(`File ${fileId} not found`)
    }

    this.openFiles[fileId].content = content
    this.openFiles[fileId].saved = false
    this.openFiles[fileId].lastModified = Date.now()

    this.emit('fileChanged', this.openFiles[fileId])
  }

  /**
   * Save a file to its handle
   */
  async saveFile(fileId) {
    if (!this.openFiles[fileId]) {
      throw new Error(`File ${fileId} not found`)
    }

    const fileData = this.openFiles[fileId]
    const { fileHandle, content } = fileData

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

      fileData.saved = true
      this.openFiles[fileId] = fileData

      this.emit('fileSaved', fileData)

      return {
        success: true,
        message: 'File saved successfully'
      }
    } catch (err) {
      console.error('Error saving file:', err)
      throw err
    }
  }

  /**
   * Remove a file from open files
   */
  removeFile(fileId) {
    if (!this.openFiles[fileId]) return

    const fileData = this.openFiles[fileId]
    const { projectId } = fileData

    delete this.openFiles[fileId]

    if (this.projects[projectId]) {
      delete this.projects[projectId].files[fileId]
    }

    this.emit('fileRemoved', fileData)
  }

  /**
   * Get file data
   */
  getFile(fileId) {
    return this.openFiles[fileId]
  }

  /**
   * Get all files in a project
   */
  getProjectFiles(projectId) {
    if (!this.projects[projectId]) return []

    const fileIds = Object.values(this.projects[projectId].files)
    return fileIds.map(fileId => this.openFiles[fileId]).filter(Boolean)
  }

  /**
   * Get project data
   */
  getProject(projectId) {
    return this.projects[projectId]
  }

  /**
   * Get all open projects
   */
  getAllProjects() {
    return Object.values(this.projects)
  }

  /**
   * Get all open files
   */
  getAllOpenFiles() {
    return Object.values(this.openFiles)
  }

  /**
   * Listen for events
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback)
      return () => {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
      }
    }
  }

  /**
   * Emit events
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data))
    }
  }

  /**
   * Check if file has unsaved changes
   */
  hasUnsavedChanges(fileId) {
    if (!this.openFiles[fileId]) return false
    return !this.openFiles[fileId].saved
  }

  /**
   * Get all unsaved files
   */
  getUnsavedFiles() {
    return Object.values(this.openFiles).filter(file => !file.saved)
  }

  /**
   * Save all unsaved files in a project
   */
  async saveAllProjectFiles(projectId) {
    const files = this.getProjectFiles(projectId)
    const unsavedFiles = files.filter(file => !file.saved)

    const results = await Promise.allSettled(
      unsavedFiles.map(file => this.saveFile(file.id))
    )

    return {
      total: unsavedFiles.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length
    }
  }
}

// Create and export a singleton instance
export const projectManager = new ProjectManager()

// Export the class for testing purposes
export { ProjectManager }
