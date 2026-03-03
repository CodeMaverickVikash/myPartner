# VS Code Online Editor - Setup & Usage Guide

A VS Code-like online editor built with React, Express, and Monaco Editor. Create, edit, and save files locally on your server.

## Features

✅ **VS Code-like Interface**
- File explorer with folder/file hierarchy
- Multi-file tab system
- Full-featured Monaco editor
- Syntax highlighting for 20+ languages
- Auto-save functionality

✅ **File Management**
- Create new files
- Delete files
- Rename files
- Organize files in folders
- File tree navigation

✅ **Local File Storage**
- Saves files to local server storage
- Files stored in `user-files/` directory
- Persistent across sessions

✅ **Keyboard Shortcuts**
- `Ctrl+S` → Save current file
- `Ctrl+Shift+S` → Save all open files

## Installation

### 1. Install Dependencies
```bash
npm install
```

This installs:
- React & React Router
- Monaco Editor
- Express.js backend
- CORS support
- Vite build tool

### 2. Run the Application

You need to run **TWO** terminals:

**Terminal 1 - Backend Server:**
```bash
npm run server
# or
node server.js
```
Server will run on `http://localhost:5000`

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
# or
npm run start
```
Vite dev server will run on `http://localhost:5173` (or next available port)

Open your browser to the URL shown (usually `http://localhost:5173`)

## Project Structure

```
markdown-viewer/
├── server.js                    # Express backend server
├── src/
│   ├── App.jsx                 # Main App component
│   ├── components/
│   │   ├── VSCodeEditor.jsx    # Main editor component
│   │   ├── VSCodeEditor.css    # Editor styles
│   │   ├── FileExplorer.jsx    # File explorer sidebar
│   │   ├── FileExplorer.css    # Explorer styles
│   ├── utils/
│   │   ├── api.js              # API client functions
│   └── main.jsx
├── user-files/                 # Where files are stored (auto-created)
├── package.json
├── vite.config.js
└── README.md
```

## API Endpoints

The backend provides REST API endpoints:

### List Files
```
GET /api/files
Response: { success: true, files: [...] }
```

### Read File
```
GET /api/files/:path
Response: { success: true, content: "..." }
```

### Create File/Folder
```
POST /api/files
Body: { filePath: "test.js", content: "...", type: "file" }
Response: { success: true, message: "..." }
```

### Update File
```
PUT /api/files/:path
Body: { content: "..." }
Response: { success: true, message: "..." }
```

### Delete File/Folder
```
DELETE /api/files/:path
Response: { success: true, message: "..." }
```

### Rename File
```
POST /api/files/rename
Body: { oldPath: "old.js", newPath: "new.js" }
Response: { success: true, message: "..." }
```

## How to Use

1. **Create a File**
   - Click the `+` button in the Explorer header
   - Enter file name with extension (e.g., `index.js`)
   - Press Enter or click Create

2. **Open a File**
   - Click any file in the Explorer
   - File opens in a new tab
   - Start editing

3. **Save Files**
   - Manual save: Press `Ctrl+S` or click Save button
   - Auto-save: Changes auto-save after 2 seconds of inactivity
   - Save All: `Ctrl+Shift+S` saves all unsaved files

4. **Delete Files**
   - Right-click file or click trash icon next to file name
   - Confirm deletion

5. **Navigate**
   - Click folder arrows to expand/collapse
   - Click filename to open it
   - Close tabs by clicking X button

## Supported Languages

JavaScript, TypeScript, JSX, TSX, Python, Java, C++, C, C#, Ruby, Go, Rust, PHP, SQL, HTML, CSS, SCSS, LESS, JSON, XML, YAML, Markdown, and more.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save current file |
| `Ctrl+Shift+S` | Save all files |
| `Ctrl+F` | Find in file |
| `Ctrl+H` | Find and replace |
| `Ctrl+/` | Toggle comment |
| `Ctrl+Space` | Trigger autocomplete |
| `Alt+↑/↓` | Move line up/down |
| `Shift+Alt+↑/↓` | Copy line up/down |

## Development

To extend the editor:

1. **Add new file type support** → Update `getLanguageFromExtension()` in `src/utils/api.js`
2. **Customize editor theme** → Modify theme in `VSCodeEditor.jsx` handleEditorMount
3. **Add commands** → Add to Monaco in `handleEditorMount`
4. **Modify UI** → Edit CSS files for styling

## Production Build

```bash
npm run build
```

Creates optimized build in `dist/` folder.

To serve production build:
```bash
npm run preview
```

## Troubleshooting

### Server not starting
- Check if port 5000 is already in use
- Check Node.js version: `node --version` (should be v14+)

### Files not saving
- Ensure server is running on port 5000
- Check browser console for API errors
- Check `user-files/` directory exists and has write permissions

### Vite dev server not working
- Clear `.vite` cache folder
- Kill any process on port 5173
- Run `npm install` again

### CORS errors
- Ensure vite.config.js has proper proxy configuration
- Server should be running with CORS enabled

## Future Enhancements

- [ ] Search across all files
- [ ] Code formatting (Prettier integration)
- [ ] Linting (ESLint integration)
- [ ] Terminal integration
- [ ] Git integration
- [ ] Theme customization
- [ ] Collaborative editing
- [ ] File preview (images, PDFs)
- [ ] Download files
- [ ] Upload files

---

**Built with ❤️ using React, Express, and Monaco Editor**
