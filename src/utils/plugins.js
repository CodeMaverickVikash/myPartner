// Built-in plugins for frontend development
export const BUILT_IN_PLUGINS = {
  eslint: {
    id: 'eslint',
    name: 'ESLint',
    description: 'JavaScript/TypeScript linter',
    enabled: true,
    supports: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
  },
  prettier: {
    id: 'prettier',
    name: 'Prettier',
    description: 'Code formatter',
    enabled: true,
    supports: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'json', 'html', 'css'],
  },
  gitLens: {
    id: 'gitLens',
    name: 'GitLens',
    description: 'Git integration and blame',
    enabled: true,
    supports: ['all'],
  },
  reactSnippets: {
    id: 'reactSnippets',
    name: 'React Snippets',
    description: 'React/JSX snippets',
    enabled: true,
    supports: ['javascriptreact', 'typescriptreact'],
  },
  vueSnippets: {
    id: 'vueSnippets',
    name: 'Vue Snippets',
    description: 'Vue.js snippets',
    enabled: false,
    supports: ['vue'],
  },
  tailwindCSS: {
    id: 'tailwindCSS',
    name: 'Tailwind CSS IntelliSense',
    description: 'Tailwind CSS class autocomplete',
    enabled: false,
    supports: ['javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'html'],
  },
};

export const PluginManager = {
  // Get all available plugins
  getAvailablePlugins: () => {
    return Object.values(BUILT_IN_PLUGINS);
  },

  // Get plugin by ID
  getPlugin: (id) => {
    return BUILT_IN_PLUGINS[id];
  },

  // Check if plugin supports language
  supportsLanguage: (pluginId, language) => {
    const plugin = BUILT_IN_PLUGINS[pluginId];
    if (!plugin) return false;
    return plugin.supports.includes('all') || plugin.supports.includes(language);
  },

  // Get enabled plugins for language
  getEnabledPluginsForLanguage: (language, enabledPlugins) => {
    return Object.entries(enabledPlugins)
      .filter(([id, enabled]) => enabled && this.supportsLanguage(id, language))
      .map(([id]) => id);
  },

  // Execute plugin action
  executePlugin: async (pluginId, action, context) => {
    const plugin = BUILT_IN_PLUGINS[pluginId];
    if (!plugin) throw new Error(`Plugin not found: ${pluginId}`);

    // Plugin execution logic
    switch (pluginId) {
      case 'prettier':
        return await executePrettier(context);
      case 'eslint':
        return await executeESLint(context);
      case 'gitLens':
        return await executeGitLens(context);
      default:
        return null;
    }
  },
};

// Plugin execution functions
async function executePrettier(context) {
  try {
    // Format code using Prettier
    console.log('Executing Prettier on:', context.file);
    // This would call your backend API
    return { success: true };
  } catch (error) {
    console.error('Prettier error:', error);
    return { success: false, error };
  }
}

async function executeESLint(context) {
  try {
    console.log('Executing ESLint on:', context.file);
    // This would call your backend API
    return { success: true };
  } catch (error) {
    console.error('ESLint error:', error);
    return { success: false, error };
  }
}

async function executeGitLens(context) {
  try {
    console.log('Executing GitLens on:', context.file);
    // This would call your backend API
    return { success: true };
  } catch (error) {
    console.error('GitLens error:', error);
    return { success: false, error };
  }
}
