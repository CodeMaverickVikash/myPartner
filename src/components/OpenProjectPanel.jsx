import React, { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { FiFolder, FiX, FiChevronRight, FiFile } from 'react-icons/fi'
import { openProjectDirectory, readDirectoryRecursive, readFileFromHandle } from '../utils/fileSystem'
import { projectManager } from '../utils/projectManager'
import './OpenProjectPanel.css'

export default function OpenProjectPanel({ onProjectOpened, isOpen, onClose }) {
  const [openedProjects, setOpenedProjects] = useState([])
  const [expandedProjects, setExpandedProjects] = useState({})
  const [loadingProjectId, setLoadingProjectId] = useState(null)

  /**
   * Open a project directory from the system
   */
  const handleOpenProject = useCallback(async () => {
    try {
      const result = await openProjectDirectory()
      if (!result) return // User cancelled

      setLoadingProjectId(result.name)

      // Close any existing projects first (only one project at a time)
      const existingProjects = projectManager.getAllProjects()
      for (const existingProject of existingProjects) {
        projectManager.closeProject(existingProject.id)
      }
      setOpenedProjects([]) // Clear the list

      // Open new project in manager
      const projectId = await projectManager.openProject(result.directoryHandle, result.name)

      // Read all files in the directory
      const files = await readDirectoryRecursive(result.directoryHandle)

      // Load all files
      const fileIds = []
      for (const fileEntry of files) {
        if (!fileEntry.isDirectory) {
          try {
            const fileData = await readFileFromHandle(fileEntry.fileHandle)
            const fileId = projectManager.addFileFromHandle(
              projectId,
              fileEntry.fileHandle,
              fileEntry.path,
              fileData.content,
              fileData.lastModified
            )
            fileIds.push(fileId)
          } catch (err) {
            console.error(`Failed to read file ${fileEntry.path}:`, err)
          }
        }
      }

      setOpenedProjects([{
        projectId,
        name: result.name,
        fileCount: fileIds.length,
        isExpanded: true,
        directoryHandle: result.directoryHandle
      }])

      toast.success(`Opened project: ${result.name}`, { duration: 2000 })

      if (onProjectOpened) {
        onProjectOpened({
          projectId,
          name: result.name,
          fileCount: fileIds.length
        })
      }

      setLoadingProjectId(null)
    } catch (err) {
      console.error('Failed to open project:', err)
      toast.error('Failed to open project', { duration: 2000 })
      setLoadingProjectId(null)
    }
  }, [onProjectOpened])

  /**
   * Toggle project expansion
   */
  const handleToggleProject = useCallback((projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }, [])

  /**
   * Close a project
   */
  const handleCloseProject = useCallback((projectId) => {
    const project = projectManager.getProject(projectId)
    const projFiles = projectManager.getProjectFiles(projectId)
    const unsavedCount = projFiles.filter(f => !f.saved).length

    let confirmMessage = `Close project "${project?.name}"?`
    if (unsavedCount > 0) {
      confirmMessage += `\n\n⚠️ ${unsavedCount} file(s) have unsaved changes.`
    }

    if (window.confirm(confirmMessage)) {
      projectManager.closeProject(projectId)
      setOpenedProjects(prev => prev.filter(p => p.projectId !== projectId))
      toast.success('Project closed', { duration: 1500 })
    }
  }, [])

  /**
   * Open a file from the project
   */
  const handleOpenFile = useCallback((fileId, fileName) => {
    const fileData = projectManager.getFile(fileId)
    if (fileData) {
      // Emit event or callback to open file in editor
      window.dispatchEvent(new CustomEvent('openProjectFile', {
        detail: { fileId, fileData, fileName }
      }))
    }
  }, [])

  if (!isOpen) return null

  const projects = projectManager.getAllProjects()
  const openFiles = projectManager.getAllOpenFiles()

  return (
    <div className="open-project-panel">
      <div className="open-project-header">
        <h3>Open Projects</h3>
        <button className="close-btn" onClick={onClose} title="Close panel">
          <FiX size={18} />
        </button>
      </div>

      <div className="open-project-content">
        <button
          className="open-project-btn"
          onClick={handleOpenProject}
          disabled={loadingProjectId !== null}
        >
          <FiFolder size={18} />
          {loadingProjectId ? 'Opening...' : 'Open Project Folder'}
        </button>

        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No projects opened yet</p>
            <p className="hint">Click "Open Project Folder" to get started</p>
          </div>
        ) : (
          <div className="projects-list">
            {projects.map(project => (
              <div key={project.id} className="project-item">
                <div className="project-header">
                  <button
                    className="expand-btn"
                    onClick={() => handleToggleProject(project.id)}
                  >
                    <FiChevronRight
                      size={16}
                      style={{
                        transform: expandedProjects[project.id] ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    />
                  </button>
                  <FiFolder size={16} />
                  <span className="project-name">{project.name}</span>
                  <span className="file-count">({openFiles.filter(f => f.projectId === project.id).length} files)</span>
                  <button
                    className="close-project-btn"
                    onClick={() => handleCloseProject(project.id)}
                    title="Close project"
                  >
                    <FiX size={14} />
                  </button>
                </div>

                {expandedProjects[project.id] && (
                  <div className="project-files">
                    {openFiles
                      .filter(file => file.projectId === project.id)
                      .map(file => (
                        <button
                          key={file.id}
                          className={`file-item ${!file.saved ? 'unsaved' : ''}`}
                          onClick={() => handleOpenFile(file.id, file.path)}
                          title={file.path}
                        >
                          <FiFile size={14} />
                          <span className="file-path">{file.path}</span>
                          {!file.saved && <span className="unsaved-indicator">●</span>}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
