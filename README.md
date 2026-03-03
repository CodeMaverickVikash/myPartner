# 📚 Markdown Viewer

A modern **React-based** interactive markdown documentation viewer with **edit mode** and **export functionality**. Built with React, Vite, and deployed as a static site.

## ✨ Features

- **📁 File Upload**: Drag-and-drop or click to upload markdown (.md) files
- **💾 LocalStorage Persistence**: Uploaded files are saved in browser localStorage
- **✏️ Edit Mode**: Edit markdown files directly in the browser
- **📥 Export**: Download edited files as .md
- **📚 Dynamic Navigation**: Auto-generates sidebar navigation from markdown headings
- **🔍 Search**: Filter files in real-time
- **📱 Responsive Design**: Mobile-friendly with collapsible sidebar
- **🎨 Syntax Highlighting**: Code blocks highlighted using highlight.js
- **⚡ Fast**: Built with Vite for lightning-fast development and optimized production builds
- **💻 Integrated Terminal**: Run shell commands directly from the editor (with security controls)
- **🌿 Git Support**: Lightweight version control panel for status, staging, commits, and logs
- **🧭 Breadcrumb Navigation**: Easily see the path of the current file (clickable segments coming soon)
- **🔁 Draggable Tabs**: Rearrange open files by dragging tabs
- **🪟 Split View**: Edit the same file side‑by‑side with a single click
- **⚙️ Persistent Settings**: All preferences are saved in localStorage
- **🌐 100% Static**: Deploys as static files - no server required

## 🚀 Quick Start

### Local Development

```bash
git clone <repository-url>
cd markdown-viewer
npm install      # Install dependencies
npm run dev      # Start development server
```

Then open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🌐 Deploy to Vercel

Deploy your markdown viewer to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/markdown-viewer)

### How It Works

1. **Vite builds the React app** to static files in the `dist/` folder
2. **Vercel serves the static files** with optimized caching
3. **All routes redirect to index.html** for client-side routing

### Manual Deployment

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

That's it! No build process needed - Vercel serves the static files directly.

### Other Static Hosts

You can deploy to any static hosting platform:

- **Netlify**: Connect your repo, no build command needed, publish directory: `.` (root)
- **GitHub Pages**: Just push to `gh-pages` branch
- **Cloudflare Pages**: Connect repo, no build command needed
- **Any static host**: Just upload all files (no build required)

## 📖 Usage

### Local Preview

Preview the site locally:

```bash
npm run serve
```

Or simply open `index.html` in your browser - no server required!

Then open http://localhost:3000 in your browser.

### Using the Viewer

1. **Upload Files**: Click the "📤 Choose Markdown Files" button or drag and drop `.md` files onto the upload area
2. **Navigate**: Use the sidebar to browse through your uploaded files and sections
3. **Search**: Use the search box to filter topics
4. **Remove Files**: Click the red ✕ button next to any uploaded file to remove it
5. **Mobile**: Click the hamburger menu (☰) to toggle the sidebar on mobile devices

**Note**: Uploaded files are saved in your browser's localStorage and will persist across sessions.

## ⚙️ Configuration

Edit the `DOCS_CONFIG` object in `index.html` (inside the `<script>` tag) to customize your documentation viewer:

```javascript
const DOCS_CONFIG = {
  siteTitle: "📚 Documentation Viewer",
  siteSubtitle: "Interactive Markdown Viewer",
  footerText: "© 2026 CodeMaravic. All rights reserved.",
  footerLinks: [
    { text: "GitHub", url: "https://github.com/..." }
  ],
  sections: [
    {
      id: "getting-started",
      name: "Getting Started",
      files: [
        { id: "intro", name: "Introduction", file: "docs/intro.md" }
      ]
    }
  ],
  welcome: {
    title: "🚀 Welcome to Documentation Viewer",
    subtitle: "Upload your markdown files to get started",
    quickLinks: [],
    stats: []
  },
  showFileNameInNav: false,
  syntaxTheme: "github-dark"
};
```

### Configuration Options

- `siteTitle`: Main title displayed in the sidebar header
- `siteSubtitle`: Subtitle displayed below the title
- `footerText`: Text displayed in the sidebar footer
- `footerLinks`: Array of links to display in the footer
- `sections`: Pre-configured documentation sections and files (optional - can upload files directly)
- `welcome`: Welcome screen configuration
- `showFileNameInNav`: Show file names in navigation
- `syntaxTheme`: Syntax highlighting theme

## 📁 Project Structure

```
markdown-viewer/
├── src/
│   ├── components/
│   │   ├── Sidebar.jsx         # File navigation sidebar
│   │   ├── Content.jsx         # Main content container
│   │   ├── MarkdownEditor.jsx  # Rich markdown editor (EasyMDE)
│   │   ├── MarkdownViewer.jsx  # Markdown renderer
│   │   └── WelcomeScreen.jsx   # Welcome/upload screen
│   ├── utils/
│   │   ├── markdown.js         # Markdown utilities
│   │   └── storage.js          # LocalStorage handling
│   ├── App.jsx                 # Main app component
│   ├── App.css                 # App-specific styles
│   ├── index.css               # Global styles & Tailwind
│   └── main.jsx                # React entry point
├── .git/                        # Git repository
├── dist/                        # Build output (production)
├── public/                      # Static assets
├── index.html                  # HTML entry point
├── vite.config.js              # Vite build config
├── tailwind.config.js          # Tailwind CSS config
├── postcss.config.js           # PostCSS config
├── package.json                # Dependencies & scripts
├── vercel.json                 # Vercel deployment config
└── README.md                   # This file
```

**Key Features**:
- React 18 - Modern UI framework
- Tailwind CSS - Utility-first styling with professional color system
- Vite - Lightning-fast build tool
- EasyMDE - Rich markdown editor with live preview
- Highlight.js - Syntax highlighting
- Marked.js - Markdown parsing

## 🛠️ Development

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Setup & Commands

```bash
# Install dependencies
npm install

# Start development server (hot reload at http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

## 📦 Dependencies

**Runtime**:
- **React 18** - UI framework
- **EasyMDE** - Rich markdown editor with toolbar & live preview
- **Marked** - Fast markdown parser
- **Highlight.js** - Syntax highlighting
- **React Icons** - Icon library

**Development**:
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - Browser prefix handling

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

