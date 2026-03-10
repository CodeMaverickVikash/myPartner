const API_BASE = 'http://localhost:5001/api';

// List all files
export const listFiles = async () => {
  try {
    const response = await fetch(`${API_BASE}/files`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.files;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};

// Read a file
export const readFile = async (filePath) => {
  try {
    const response = await fetch(`${API_BASE}/files/${filePath}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

// Create a new file
export const createFile = async (filePath, content = '', type = 'file') => {
  try {
    const response = await fetch(`${API_BASE}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, content, type })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
};

// Update a file
export const updateFile = async (filePath, content) => {
  try {
    const response = await fetch(`${API_BASE}/files/${filePath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
};

// Delete a file
export const deleteFile = async (filePath) => {
  try {
    const response = await fetch(`${API_BASE}/files/${filePath}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

// Rename a file
export const renameFile = async (oldPath, newPath) => {
  try {
    const response = await fetch(`${API_BASE}/files/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('Error renaming file:', error);
    throw error;
  }
};

// Monaco language IDs – must exactly match Monaco's registered language identifiers
const LANGUAGE_MAP = {
  // JavaScript / TypeScript
  'js':    'javascript',
  'jsx':   'javascript',   // Monaco uses 'javascript' for JSX too
  'mjs':   'javascript',
  'cjs':   'javascript',
  'ts':    'typescript',
  'tsx':   'typescript',   // Monaco uses 'typescript' for TSX too
  'mts':   'typescript',
  'cts':   'typescript',
  'd.ts':  'typescript',
  // Web
  'html':  'html',
  'htm':   'html',
  'css':   'css',
  'scss':  'scss',
  'sass':  'scss',
  'less':  'less',
  // Data / Config
  'json':  'json',
  'jsonc': 'json',
  'xml':   'xml',
  'xsl':   'xml',
  'svg':   'xml',
  'yaml':  'yaml',
  'yml':   'yaml',
  'toml':  'ini',
  'ini':   'ini',
  'env':   'ini',
  // Scripting
  'py':    'python',
  'rb':    'ruby',
  'php':   'php',
  'lua':   'lua',
  'r':     'r',
  // Systems / JVM
  'java':  'java',
  'kt':    'kotlin',
  'kts':   'kotlin',
  'scala': 'scala',
  'cpp':   'cpp',
  'cc':    'cpp',
  'cxx':   'cpp',
  'c':     'c',
  'h':     'c',
  'hpp':   'cpp',
  'cs':    'csharp',
  'go':    'go',
  'rs':    'rust',
  'swift': 'swift',
  // Shell
  'sh':    'shell',
  'bash':  'shell',
  'zsh':   'shell',
  'fish':  'shell',
  'ps1':   'powershell',
  'psm1':  'powershell',
  'bat':   'bat',
  'cmd':   'bat',
  // Docs / Text
  'md':    'markdown',
  'mdx':   'markdown',
  'txt':   'plaintext',
  'log':   'plaintext',
  // DB
  'sql':   'sql',
  'graphql': 'graphql',
  'gql':   'graphql',
  // Misc
  'dockerfile': 'dockerfile',
  'makefile':   'makefile',
};

// Display names shown in the status bar (human-readable)
const DISPLAY_LANGUAGE_MAP = {
  'javascript': 'JavaScript',
  'typescript': 'TypeScript',
  'html':       'HTML',
  'css':        'CSS',
  'scss':       'SCSS',
  'less':       'Less',
  'json':       'JSON',
  'xml':        'XML',
  'yaml':       'YAML',
  'ini':        'INI / TOML',
  'python':     'Python',
  'ruby':       'Ruby',
  'php':        'PHP',
  'lua':        'Lua',
  'r':          'R',
  'java':       'Java',
  'kotlin':     'Kotlin',
  'scala':      'Scala',
  'cpp':        'C++',
  'c':          'C',
  'csharp':     'C#',
  'go':         'Go',
  'rust':       'Rust',
  'swift':      'Swift',
  'shell':      'Shell Script',
  'powershell': 'PowerShell',
  'bat':        'Batch',
  'markdown':   'Markdown',
  'sql':        'SQL',
  'graphql':    'GraphQL',
  'dockerfile': 'Dockerfile',
  'makefile':   'Makefile',
  'plaintext':  'Plain Text',
};

/** Returns the Monaco language ID for a given file path */
export const getLanguageFromExtension = (filePath) => {
  const name = (filePath || '').split('/').pop().toLowerCase();
  // Special full-name matches first
  if (name === 'dockerfile') return 'dockerfile';
  if (name === 'makefile')   return 'makefile';
  // Strip leading dot for hidden files (.env → env)
  const ext = name.includes('.') ? name.split('.').pop() : name;
  return LANGUAGE_MAP[ext] || 'plaintext';
};

/** Returns a human-readable label for the status bar */
export const getDisplayLanguage = (filePath) => {
  const lang = getLanguageFromExtension(filePath);
  const name  = (filePath || '').split('/').pop().toLowerCase();
  const ext   = name.includes('.') ? name.split('.').pop() : '';
  // Distinguish JSX / TSX in the display label
  if (ext === 'jsx') return 'JavaScript (JSX)';
  if (ext === 'tsx') return 'TypeScript (JSX)';
  return DISPLAY_LANGUAGE_MAP[lang] || lang;
};

// Workspace config helpers
export const loadWorkspaceConfig = async (name = 'default') => {
  try {
    const response = await fetch(`${API_BASE}/workspace?name=${encodeURIComponent(name)}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.config;
  } catch (error) {
    console.error('Error loading workspace config:', error);
    throw error;
  }
};

export const saveWorkspaceConfig = async (name = 'default', config) => {
  try {
    const response = await fetch(`${API_BASE}/workspace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error('Error saving workspace config:', error);
    throw error;
  }
};

// Get icon for file type
export const getFileIcon = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const iconMap = {
    'js': '📄',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'html': '🌐',
    'css': '🎨',
    'json': '{}',
    'md': '📝',
    'txt': '📋',
    'pdf': '📕',
    'zip': '📦',
  };
  return iconMap[ext] || '📄';
};

// Search file contents
export const searchInFiles = async (query) => {
  try {
    const response = await fetch(`${API_BASE}/files/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.results;
  } catch (error) {
    console.error('Error searching files:', error);
    throw error;
  }
};

// Terminal command execution
export const executeTerminalCommand = async (command) => {
  try {
    const response = await fetch(`${API_BASE}/terminal/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    return await response.json();
  } catch (error) {
    console.error('Error executing terminal command:', error);
    throw error;
  }
};

// Git helpers
export const gitStatus = async () => {
  try {
    const response = await fetch(`${API_BASE}/git/status`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching git status:', error);
    throw error;
  }
};

export const gitInit = async () => {
  try {
    const response = await fetch(`${API_BASE}/git/init`, { method: 'POST' });
    return await response.json();
  } catch (error) {
    console.error('Error initializing git:', error);
    throw error;
  }
};

export const gitAdd = async (files = '.') => {
  try {
    const response = await fetch(`${API_BASE}/git/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });
    return await response.json();
  } catch (error) {
    console.error('Error staging git files:', error);
    throw error;
  }
};

export const gitCommit = async (message) => {
  try {
    const response = await fetch(`${API_BASE}/git/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return await response.json();
  } catch (error) {
    console.error('Error committing git:', error);
    throw error;
  }
};

export const gitLog = async (limit = 10) => {
  try {
    const response = await fetch(`${API_BASE}/git/log?limit=${limit}`);
    return await response.json();
  } catch (error) {
    console.error('Error getting git log:', error);
    throw error;
  }
};

export const gitDiff = async (file = '') => {
  try {
    const url = file ? `${API_BASE}/git/diff?file=${encodeURIComponent(file)}` : `${API_BASE}/git/diff`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error getting git diff:', error);
    throw error;
  }
};

export const gitConfig = async (name, email) => {
  try {
    const response = await fetch(`${API_BASE}/git/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    return await response.json();
  } catch (error) {
    console.error('Error configuring git:', error);
    throw error;
  }
};
