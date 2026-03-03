import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files directory - where user files will be stored
const FILES_DIR = path.join(__dirname, 'user-files');

// Create user-files directory if it doesn't exist
if (!fs.existsSync(FILES_DIR)) {
  fs.mkdirSync(FILES_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// Utility functions
const sanitizePath = (filePath) => {
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(FILES_DIR, normalized);
  
  // Prevent directory traversal attacks
  if (!resolved.startsWith(FILES_DIR)) {
    throw new Error('Invalid file path');
  }
  
  return resolved;
};

// GET /api/files - List all files
app.get('/api/files', (req, res) => {
  try {
    const files = listFilesRecursive(FILES_DIR);
    res.json({ success: true, files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/files/:path - Read a file
app.get('/api/files/*', (req, res) => {
  try {
    const filePath = sanitizePath(req.params[0]);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ success: true, content });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/files - Create a new file
app.post('/api/files', (req, res) => {
  try {
    const { filePath, content = '', type = 'file' } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' });
    }
    
    const fullPath = sanitizePath(filePath);
    const dir = path.dirname(fullPath);
    
    // Create directories if they don't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (type === 'folder') {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    } else {
      fs.writeFileSync(fullPath, content);
    }
    
    res.json({ success: true, message: `${type} created successfully` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/files/:path - Update a file
app.put('/api/files/*', (req, res) => {
  try {
    const filePath = sanitizePath(req.params[0]);
    const { content } = req.body;
    
    if (content === undefined) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }
    
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, content);
    res.json({ success: true, message: 'File updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/files/:path - Delete a file or folder
app.delete('/api/files/*', (req, res) => {
  try {
    const filePath = sanitizePath(req.params[0]);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    if (fs.statSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true });
    } else {
      fs.unlinkSync(filePath);
    }
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/files/rename - Rename a file
app.post('/api/files/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    
    if (!oldPath || !newPath) {
      return res.status(400).json({ success: false, error: 'oldPath and newPath are required' });
    }
    
    const fullOldPath = sanitizePath(oldPath);
    const fullNewPath = sanitizePath(newPath);
    
    if (!fs.existsSync(fullOldPath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    fs.renameSync(fullOldPath, fullNewPath);
    res.json({ success: true, message: 'File renamed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to list files recursively
function listFilesRecursive(dir, baseDir = FILES_DIR) {
  const items = [];
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      items.push({
        name: file,
        path: relativePath,
        type: 'folder',
        children: listFilesRecursive(filePath, baseDir)
      });
    } else {
      items.push({
        name: file,
        path: relativePath,
        type: 'file'
      });
    }
  });
  
  return items.sort((a, b) => {
    // Folders first, then alphabetically
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Files stored in: ${FILES_DIR}`);
});
