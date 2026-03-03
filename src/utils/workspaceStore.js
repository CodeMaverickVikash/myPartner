import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useWorkspaceStore = create(
  persist(
    (set, get) => ({
      // Workspace State
      openTabs: [],
      currentTabId: null,
      tabContent: {},
      tabMetadata: {},
      
      // Project Settings
      projectSettings: {
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: 'on',
        formatOnSave: true,
        formatOnPaste: true,
        autoComplete: true,
        showLineNumbers: true,
        enableLSP: true
      },

      // Plugins
      enabledPlugins: {
        eslint: true,
        prettier: true,
        gitLens: true,
        reactSnippets: true,
        vueSnippets: false,
        tailwindCSS: false,
        angularSnippets: false
      },

      // Diagnostics
      diagnostics: {},

      // Actions
      addTab: (tabId, name, language, content, filePath) => {
        set(state => {
          const newTabs = [...state.openTabs, tabId]
          return {
            openTabs: newTabs,
            currentTabId: tabId,
            tabContent: { ...state.tabContent, [tabId]: content },
            tabMetadata: {
              ...state.tabMetadata,
              [tabId]: { name, language, filePath, isDirty: false, version: 1 }
            }
          }
        })
      },

      removeTab: (tabId) => {
        set(state => {
          const newTabs = state.openTabs.filter(id => id !== tabId)
          const newContent = { ...state.tabContent }
          const newMetadata = { ...state.tabMetadata }
          delete newContent[tabId]
          delete newMetadata[tabId]

          return {
            openTabs: newTabs,
            currentTabId: newTabs.length > 0 ? newTabs[newTabs.length - 1] : null,
            tabContent: newContent,
            tabMetadata: newMetadata
          }
        })
      },

      setCurrentTab: (tabId) => {
        set({ currentTabId: tabId })
      },

      updateTabContent: (tabId, content) => {
        set(state => ({
          tabContent: { ...state.tabContent, [tabId]: content },
          tabMetadata: {
            ...state.tabMetadata,
            [tabId]: { ...state.tabMetadata[tabId], isDirty: true }
          }
        }))
      },

      saveTab: (tabId) => {
        set(state => ({
          tabMetadata: {
            ...state.tabMetadata,
            [tabId]: { ...state.tabMetadata[tabId], isDirty: false }
          }
        }))
      },

      updateProjectSetting: (key, value) => {
        set(state => ({
          projectSettings: { ...state.projectSettings, [key]: value }
        }))
      },

      updatePlugins: (plugins) => {
        set({ enabledPlugins: plugins })
      },

      setDiagnostics: (uri, diags) => {
        set(state => ({
          diagnostics: { ...state.diagnostics, [uri]: diags }
        }))
      },

      clearWorkspace: () => {
        set({
          openTabs: [],
          currentTabId: null,
          tabContent: {},
          tabMetadata: {},
          diagnostics: {}
        })
      }
    }),
    {
      name: 'workspace-storage',
      version: 1
    }
  )
)
