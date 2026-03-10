import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync, spawn } from 'child_process';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc';

const app = express();
// enable websocket support for language server
expressWs(app);
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

// GET /api/files/search?q=term - Search file contents (must be before the wildcard route)
app.get('/api/files/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, error: 'query parameter q is required' });
    }

    const results = [];
    const query = q.toLowerCase();
    const MAX_RESULTS = 200;

    const searchInFile = (filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const matches = [];
        lines.forEach((line, idx) => {
          if (line.toLowerCase().includes(query)) {
            matches.push({ line: idx + 1, content: line.trimEnd(), column: line.toLowerCase().indexOf(query) + 1 });
          }
        });
        if (matches.length > 0) {
          results.push({ file: path.relative(FILES_DIR, filePath).replace(/\\/g, '/'), matches });
        }
      } catch (_) { /* skip binary / unreadable files */ }
    };

    const walk = (dir) => {
      if (results.length >= MAX_RESULTS) return;
      fs.readdirSync(dir).forEach(item => {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) walk(full);
        else searchInFile(full);
      });
    };

    walk(FILES_DIR);
    res.json({ success: true, results, query: q });
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

// Workspace endpoints
// Workspace helpers (support multiple named workspaces)
const getWorkspacePath = (name = 'default') => path.join(FILES_DIR, `workspace-${name}.json`);

// GET /api/workspace?name=foo - return saved workspace config
app.get('/api/workspace', (req, res) => {
  try {
    const name = req.query.name || 'default';
    const file = getWorkspacePath(name);
    let config = {};
    if (fs.existsSync(file)) {
      config = JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/workspace - save workspace configuration
app.post('/api/workspace', (req, res) => {
  try {
    const { name = 'default', config } = req.body;
    const file = getWorkspacePath(name);
    fs.writeFileSync(file, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// (duplicate search route removed – canonical route is above the wildcard GET)

// Language server websocket endpoint
app.ws('/api/lsp', (ws, req) => {
  // spawn a typescript language server process
  const serverProcess = spawn('typescript-language-server', ['--stdio'], { cwd: FILES_DIR });

  const serverReader = new StreamMessageReader(serverProcess.stdout);
  const serverWriter = new StreamMessageWriter(serverProcess.stdin);

  // pipe raw messages between ws and server
  ws.on('message', (msg) => {
    serverWriter.write(msg);
  });

  serverReader.listen((message) => {
    try { ws.send(JSON.stringify(message)); } catch {};
  });

  serverProcess.on('exit', () => ws.close());
  ws.on('close', () => serverProcess.kill());
});

// Terminal endpoints
// POST /api/terminal/execute - Execute a terminal command
app.post('/api/terminal/execute', (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ success: false, error: 'command is required' });
    }

    // List of allowed commands for safety (comprehensive IDE terminal set)
    const allowedCommands = [
      // File system
      'ls', 'dir', 'pwd', 'echo', 'cat', 'type', 'more', 'less',
      'touch', 'mkdir', 'mv', 'cp', 'rm', 'del', 'copy', 'move',
      'find', 'grep', 'where', 'which',
      'head', 'tail', 'wc', 'sort', 'uniq', 'diff',
      'tree', 'stat', 'file',
      // System info
      'date', 'time', 'whoami', 'hostname', 'uname', 'clear',
      'env', 'set', 'printenv', 'export',
      // Node / package managers
      'node', 'npm', 'npx', 'yarn', 'pnpm', 'bun',
      // Python
      'python', 'python3', 'pip', 'pip3', 'pipenv', 'poetry',
      // Version control
      'git',
      // Build tools
      'make', 'cmake', 'cargo', 'go', 'tsc', 'babel', 'eslint', 'prettier',
      // Editors / misc CLI
      'code', 'curl', 'wget', 'ping', 'nslookup',
      'lsof', 'ps', 'kill', 'pkill',
      // PowerShell-friendly
      'Get-ChildItem', 'Get-Location', 'Set-Location', 'cd', 'ls.exe',
    ];
    const commandName = command.split(/\s+/)[0].replace(/^["']|["']$/g, '');

    if (!allowedCommands.includes(commandName)) {
      return res.status(403).json({ success: false, error: `Command not allowed: '${commandName}'. Use git, npm, node, ls, cat, echo, find, grep, etc.` });
    }

    // Execute command in the project directory with timeout
    const result = spawnSync(command, [], {
      cwd: FILES_DIR,
      shell: true,
      timeout: 15000,
      encoding: 'utf-8'
    });

    const output = (result.stdout || '') + (result.stderr || '');
    const success = result.status === 0 || result.status === null;

    res.json({
      success,
      output,
      cwd: FILES_DIR,
      status: result.status,
      error: result.error ? result.error.message : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Git endpoints
// GET /api/git/status - Get git status
app.get('/api/git/status', (req, res) => {
  try {
    const result = spawnSync('git', ['status', '--porcelain'], {
      cwd: FILES_DIR,
      encoding: 'utf-8'
    });

    const lines = result.stdout.trim().split('\n').filter(line => line.length > 0);
    const changes = lines.map(line => {
      const xy = line.substring(0, 2);
      const filePath = line.substring(3);
      // Determine a single-letter display status
      const x = xy[0]; // index status
      const y = xy[1]; // working tree status
      let status = 'M';
      if (x === '?' || y === '?') status = '?';
      else if (x === 'D' || y === 'D') status = 'D';
      else if (x === 'A') status = 'A';
      else if (x === 'R' || y === 'R') status = 'R';
      else if (x === 'M' || y === 'M') status = 'M';
      return { status, path: filePath, file: filePath, staged: x !== ' ' && x !== '?', modified: y !== ' ' };
    });

    res.json({ success: true, changes, raw: result.stdout });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/git/init - Initialize a git repository
app.post('/api/git/init', (req, res) => {
  try {
    const result = spawnSync('git', ['init'], {
      cwd: FILES_DIR,
      encoding: 'utf-8'
    });

    res.json({ 
      success: result.status === 0, 
      message: result.stdout || result.stderr,
      output: result.stdout + result.stderr
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/git/add - Stage files
app.post('/api/git/add', (req, res) => {
  try {
    const { files = '.' } = req.body;
    const result = spawnSync('git', ['add', files], {
      cwd: FILES_DIR,
      encoding: 'utf-8'
    });

    res.json({ 
      success: result.status === 0, 
      message: 'Files staged successfully',
      output: result.stdout + result.stderr
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/git/commit - Create a commit
app.post('/api/git/commit', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Commit message is required' });
    }

    const result = spawnSync('git', ['commit', '-m', message], {
      cwd: FILES_DIR,
      encoding: 'utf-8'
    });

    res.json({ 
      success: result.status === 0, 
      message: result.stdout || result.stderr,
      output: result.stdout + result.stderr
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/git/log - Get commit history
app.get('/api/git/log', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = spawnSync('git', ['log', '--pretty=format:%H|%s|%an|%ar', `-${limit}`], {
      cwd: FILES_DIR,
      encoding: 'utf-8'
    });

    const commits = result.stdout.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => {
        const [hash, message, author, date] = line.split('|');
        return { hash, message, author, date };
      });
    res.json({ success: true, commits, raw: result.stdout });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/git/diff - Get diff of unstaged changes
app.get('/api/git/diff', (req, res) => {
  try {
    const file = req.query.file || '';
    const args = file ? ['diff', file] : ['diff'];
    
    const result = spawnSync('git', args, {
      cwd: FILES_DIR,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024
    });

    res.json({ success: true, diff: result.stdout, raw: result.stdout });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/git/config - Configure git user
app.post('/api/git/config', (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'name and email are required' });
    }

    const result1 = spawnSync('git', ['config', 'user.name', name], {
      cwd: FILES_DIR,
      encoding: 'utf-8'
    });

    const result2 = spawnSync('git', ['config', 'user.email', email], {
      cwd: FILES_DIR,
      encoding: 'utf-8'
    });

    res.json({ 
      success: result1.status === 0 && result2.status === 0,
      message: 'Git configured successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Files stored in: ${FILES_DIR}`);
});
