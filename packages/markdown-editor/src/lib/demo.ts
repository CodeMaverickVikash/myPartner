import type { MarkdownFile } from '../types'

export const DEMO_FILE_ID = 'demo-getting-started'

export const demoFile: MarkdownFile = {
  id: DEMO_FILE_ID,
  name: 'Getting Started',
  content: `# Getting Started

Welcome to **MyPartner Markdown Editor**. This demo file is yours to edit — modify it, then use the **copy button** (toolbar → clipboard icon) to grab the raw markdown.

---

## Text Formatting

Make text **bold**, *italic*, or ~~strikethrough~~. Combine them: ***bold italic***.

Inline \`code\` renders in monospace. Use it for variable names, commands, or short snippets.

> Blockquotes stand out visually — great for callouts, tips, or quotes.

---

## Lists

### Unordered
- First item
- Second item
  - Nested item
  - Another nested item

### Ordered
1. Open a file or edit this one
2. Format with the toolbar
3. Copy the markdown

### Task List
- [x] Open the editor
- [ ] Edit this file
- [ ] Copy the markdown

---

## Code Block

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`
}

console.log(greet('World'))
\`\`\`

---

## Table

| Feature          | Available |
| ---------------- | --------- |
| Rich editing     | ✅        |
| Syntax highlight | ✅        |
| Copy markdown    | ✅        |
| File sync        | ✅        |
| Dark mode        | ✅        |

---

## Collapsible Section

<details>
<summary>Click to expand</summary>

Hidden content goes here. Use collapsibles for FAQs, optional details, or long sections that clutter the main flow.

</details>

---

## Links & Images

[Visit the Markdown Guide](https://www.markdownguide.org) for a full syntax reference.

![Sample image](https://picsum.photos/seed/demo/600/200)

---

*Edit freely — changes are auto-saved in your browser. Click the clipboard icon in the toolbar to copy the raw markdown.*`,
  uploadedAt: '2026-01-01T00:00:00.000Z',
  isSystemFile: false,
}
