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

// Get file extension and language
export const getLanguageFromExtension = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const languageMap = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'txt': 'plaintext',
  };
  return languageMap[ext] || 'plaintext';
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
