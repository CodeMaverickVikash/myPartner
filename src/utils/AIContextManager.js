/**
 * AIContextManager - Manages code context, semantic analysis, and project indexing
 * Provides "Better Context" through intelligent code understanding
 */

class AIContextManager {
  constructor() {
    this.fileIndex = new Map(); // filePath -> { variables, functions, imports, exports, classes }
    this.projectIndex = new Map(); // projectId -> { files, components, dependencies }
    this.variableScopes = new Map(); // fileId -> variable tracking
    this.dependencyGraph = new Map(); // file dependencies
    this.lastAnalyzed = new Map(); // track when files were analyzed
  }

  /**
   * Analyze a file's code and extract context
   */
  analyzeFileContext(filePath, content) {
    const context = {
      variables: [],
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      types: [],
      comments: [],
      analyzedAt: Date.now()
    };

    // Extract imports
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"][^'"]+['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      context.imports.push(match[0]);
    }

    // Extract exports
    const exportRegex = /export\s+(?:function|const|class|default)\s+(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      context.exports.push(match[1]);
    }

    // Extract functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=>]*)\s*=>/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      context.functions.push({
        name: funcName,
        isAsync: content.substring(Math.max(0, match.index - 10), match.index).includes('async'),
        line: content.substring(0, match.index).split('\n').length
      });
    }

    // Extract class definitions
    const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    while ((match = classRegex.exec(content)) !== null) {
      context.classes.push({
        name: match[1],
        extends: match[2] || null,
        line: content.substring(0, match.index).split('\n').length
      });
    }

    // Extract variables
    const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
    while ((match = varRegex.exec(content)) !== null) {
      context.variables.push({
        name: match[1],
        line: content.substring(0, match.index).split('\n').length
      });
    }

    // Extract JSDoc/comments
    const commentRegex = /\/\*\*[\s\S]*?\*\/|\/\/\s*.+/g;
    while ((match = commentRegex.exec(content)) !== null) {
      context.comments.push({
        text: match[0],
        line: content.substring(0, match.index).split('\n').length
      });
    }

    this.fileIndex.set(filePath, context);
    return context;
  }

  /**
   * Get semantic context for a specific line in a file
   */
  getLineContext(filePath, lineNumber) {
    const context = this.fileIndex.get(filePath);
    if (!context) return null;

    return {
      variables: context.variables.filter(v => v.line <= lineNumber),
      functions: context.functions.filter(f => f.line <= lineNumber),
      imports: context.imports,
      availableExports: this.getAvailableImports(filePath, context.imports)
    };
  }

  /**
   * Find all available imports based on project structure
   */
  getAvailableImports(currentFile, existingImports) {
    const available = [];
    
    this.fileIndex.forEach((context, filePath) => {
      if (filePath !== currentFile) {
        context.exports.forEach(exp => {
          if (!existingImports.some(imp => imp.includes(exp))) {
            available.push({
              name: exp,
              from: filePath,
              type: context.classes.some(c => c.name === exp) ? 'class' : 'function'
            });
          }
        });
      }
    });

    return available;
  }

  /**
   * Analyze project structure and build index
   */
  indexProject(projectId, files) {
    const projectContext = {
      files: {},
      components: [],
      utilities: [],
      hooks: [],
      types: [],
      dependencies: new Set()
    };

    files.forEach(file => {
      const filePath = file.path || file.name;
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        // Will be analyzed when file is opened
        projectContext.files[filePath] = { analyzed: false };

        // Categorize by naming conventions
        if (filePath.includes('components/')) projectContext.components.push(filePath);
        else if (filePath.includes('utils/')) projectContext.utilities.push(filePath);
        else if (filePath.includes('hooks/') || filePath.startsWith('use')) projectContext.hooks.push(filePath);
      }
    });

    this.projectIndex.set(projectId, projectContext);
    return projectContext;
  }

  /**
   * Build dependency graph for a file
   */
  buildDependencyGraph(filePath, context) {
    const dependencies = [];

    context.imports.forEach(importStr => {
      // Extract module name
      const match = importStr.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        const modulePath = match[1];
        if (!modulePath.startsWith('.')) {
          // External dependency
          dependencies.push({ type: 'external', name: modulePath });
        } else {
          // Internal dependency
          dependencies.push({ type: 'internal', path: modulePath });
        }
      }
    });

    this.dependencyGraph.set(filePath, dependencies);
    return dependencies;
  }

  /**
   * Get complete context for code completion
   */
  getCompletionContext(filePath, lineNumber, column, content) {
    const lineContext = this.getLineContext(filePath, lineNumber);
    const currentLine = content.split('\n')[lineNumber - 1] || '';
    const beforeCursor = currentLine.substring(0, column);

    return {
      lineContext,
      currentLine,
      beforeCursor,
      variables: lineContext?.variables || [],
      functions: lineContext?.functions || [],
      availableImports: lineContext?.availableExports || [],
      inObject: beforeCursor.includes('{'),
      inArray: beforeCursor.includes('['),
      isComment: beforeCursor.trim().startsWith('//') || beforeCursor.trim().startsWith('*')
    };
  }

  /**
   * Suggest completions based on context
   */
  suggestCompletions(context, prefix = '') {
    const suggestions = [];

    // Suggest variables
    context.variables.forEach(v => {
      if (v.name.startsWith(prefix)) {
        suggestions.push({
          label: v.name,
          kind: 'Variable',
          detail: 'Local variable',
          sortText: `1_${v.name}`
        });
      }
    });

    // Suggest functions
    context.functions.forEach(f => {
      if (f.name.startsWith(prefix)) {
        suggestions.push({
          label: f.name,
          kind: 'Function',
          detail: f.isAsync ? 'Async function' : 'Function',
          sortText: `2_${f.name}`
        });
      }
    });

    // Suggest available imports
    context.availableImports.forEach(imp => {
      if (imp.name.startsWith(prefix)) {
        suggestions.push({
          label: imp.name,
          kind: imp.type === 'class' ? 'Class' : 'Function',
          detail: `From ${imp.from}`,
          sortText: `3_${imp.name}`
        });
      }
    });

    // Suggest keywords
    const keywords = ['async', 'await', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'function', 'return', 'try', 'catch', 'throw'];
    keywords.forEach(kw => {
      if (kw.startsWith(prefix)) {
        suggestions.push({
          label: kw,
          kind: 'Keyword',
          sortText: `4_${kw}`
        });
      }
    });

    return suggestions.sort((a, b) => a.sortText.localeCompare(b.sortText));
  }

  /**
   * Get all defined symbols in a file
   */
  getFileSymbols(filePath) {
    const context = this.fileIndex.get(filePath);
    if (!context) return [];

    return [
      ...context.functions.map(f => ({ name: f.name, kind: 'Function', line: f.line })),
      ...context.classes.map(c => ({ name: c.name, kind: 'Class', line: c.line })),
      ...context.variables.map(v => ({ name: v.name, kind: 'Variable', line: v.line })),
      ...context.exports.map(e => ({ name: e, kind: 'Export' }))
    ];
  }

  /**
   * Find references to a symbol
   */
  findReferences(symbol) {
    const references = [];

    this.fileIndex.forEach((context, filePath) => {
      context.variables.forEach(v => {
        if (v.name === symbol) {
          references.push({ type: 'variable', file: filePath, line: v.line });
        }
      });
      context.functions.forEach(f => {
        if (f.name === symbol) {
          references.push({ type: 'function', file: filePath, line: f.line });
        }
      });
      context.classes.forEach(c => {
        if (c.name === symbol) {
          references.push({ type: 'class', file: filePath, line: c.line });
        }
      });
    });

    return references;
  }

  /**
   * Clear cache for a specific file
   */
  invalidateFile(filePath) {
    this.fileIndex.delete(filePath);
    this.dependencyGraph.delete(filePath);
    this.lastAnalyzed.delete(filePath);
  }

  /**
   * Get all indexed files
   */
  getAllIndexedFiles() {
    return Array.from(this.fileIndex.keys());
  }

  /**
   * Export context for debugging
   */
  exportContext() {
    return {
      fileCount: this.fileIndex.size,
      projectCount: this.projectIndex.size,
      files: Array.from(this.fileIndex.keys()),
      projects: Array.from(this.projectIndex.keys())
    };
  }
}

// Singleton instance
const aiContextManager = new AIContextManager();
export default aiContextManager;
