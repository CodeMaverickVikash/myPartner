const WORKSPACE_KEY = 'vs-code-workspace';
const WORKSPACE_SETTINGS = 'vs-code-settings';
const PLUGINS_KEY = 'vs-code-plugins';

export const WorkspaceManager = {
  // Save workspace state (open tabs, current file, etc.)
  saveWorkspace: (state) => {
    try {
      const workspace = {
        openFiles: state.openFiles || [],
        currentFile: state.currentFile || null,
        expandedFolders: Array.from(state.expandedFolders || []),
        splitMode: state.splitMode || false,
        timestamp: Date.now(),
      };
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
    } catch (error) {
      console.error('Failed to save workspace:', error);
    }
  },

  // Load workspace state
  loadWorkspace: () => {
    try {
      const workspace = localStorage.getItem(WORKSPACE_KEY);
      return workspace ? JSON.parse(workspace) : null;
    } catch (error) {
      console.error('Failed to load workspace:', error);
      return null;
    }
  },

  // Save project-level settings
  saveProjectSettings: (settings) => {
    try {
      const projectSettings = {
        ...settings,
        timestamp: Date.now(),
      };
      localStorage.setItem(WORKSPACE_SETTINGS, JSON.stringify(projectSettings));
    } catch (error) {
      console.error('Failed to save project settings:', error);
    }
  },

  // Load project settings
  loadProjectSettings: () => {
    try {
      const settings = localStorage.getItem(WORKSPACE_SETTINGS);
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      console.error('Failed to load project settings:', error);
      return {};
    }
  },

  // Get .vscode/settings.json path
  getVSCodeSettingsPath: () => {
    return '.vscode/settings.json';
  },

  // Save enabled plugins
  savePlugins: (plugins) => {
    try {
      localStorage.setItem(PLUGINS_KEY, JSON.stringify(plugins));
    } catch (error) {
      console.error('Failed to save plugins:', error);
    }
  },

  // Load enabled plugins
  loadPlugins: () => {
    try {
      const plugins = localStorage.getItem(PLUGINS_KEY);
      return plugins ? JSON.parse(plugins) : {};
    } catch (error) {
      console.error('Failed to load plugins:', error);
      return {};
    }
  },

  // Export workspace as JSON file
  exportWorkspace: () => {
    try {
      const workspace = localStorage.getItem(WORKSPACE_KEY);
      const settings = localStorage.getItem(WORKSPACE_SETTINGS);
      const plugins = localStorage.getItem(PLUGINS_KEY);

      const data = {
        workspace: workspace ? JSON.parse(workspace) : {},
        settings: settings ? JSON.parse(settings) : {},
        plugins: plugins ? JSON.parse(plugins) : {},
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workspace-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('✅ Workspace exported');
    } catch (error) {
      console.error('Failed to export workspace:', error);
    }
  },

  // Import workspace from JSON file
  importWorkspace: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.workspace) localStorage.setItem(WORKSPACE_KEY, JSON.stringify(data.workspace));
          if (data.settings) localStorage.setItem(WORKSPACE_SETTINGS, JSON.stringify(data.settings));
          if (data.plugins) localStorage.setItem(PLUGINS_KEY, JSON.stringify(data.plugins));
          console.log('✅ Workspace imported');
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },
};
