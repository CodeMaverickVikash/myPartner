/**
 * CodeCompleter - Intelligent code completion engine
 * Provides smart suggestions based on context and code analysis
 */

import aiContextManager from './AIContextManager.js';

class CodeCompleter {
  constructor() {
    this.completionCache = new Map();
    this.recentCompletions = new Map(); // filePath -> [completions]
  }

  /**
   * Get completion suggestions at a specific position
   */
  getCompletions(filePath, content, lineNumber, column) {
    const cacheKey = `${filePath}:${lineNumber}:${column}`;

    if (this.completionCache.has(cacheKey)) {
      return this.completionCache.get(cacheKey);
    }

    const context = aiContextManager.getCompletionContext(filePath, lineNumber, column, content);
    const completions = [];

    // Get all types of completions
    completions.push(...this.getVariableCompletions(context));
    completions.push(...this.getFunctionCompletions(context));
    completions.push(...this.getKeywordCompletions(context));
    completions.push(...this.getImportCompletions(context));
    completions.push(...this.getPropertyCompletions(context, content, lineNumber, column));
    completions.push(...this.getMethodCompletions(context));
    completions.push(...this.getSnippetCompletions(context));

    // Sort by relevance
    const sorted = this.sortCompletions(completions, context);
    this.completionCache.set(cacheKey, sorted);

    return sorted;
  }

  /**
   * Get variable completions
   */
  getVariableCompletions(context) {
    return (context.variables || []).map(v => ({
      label: v.name,
      kind: 'Variable',
      detail: 'Local variable',
      icon: '○',
      sortText: `1_${v.name}`,
      command: { title: 'Insert', command: 'editor.action.triggerSuggest' }
    }));
  }

  /**
   * Get function completions
   */
  getFunctionCompletions(context) {
    return (context.functions || []).map(f => ({
      label: f.name,
      kind: 'Function',
      detail: f.isAsync ? 'async function' : 'function',
      icon: 'ƒ',
      sortText: `2_${f.name}`,
      insertText: `${f.name}($0)`,
      insertTextFormat: 2 // Snippet
    }));
  }

  /**
   * Get keyword completions
   */
  getKeywordCompletions(context) {
    const keywords = [
      { label: 'async', detail: 'Async keyword' },
      { label: 'await', detail: 'Await keyword' },
      { label: 'const', detail: 'Declare constant' },
      { label: 'let', detail: 'Declare variable' },
      { label: 'if', detail: 'If statement', insertText: 'if ($0) {}' },
      { label: 'else', detail: 'Else clause' },
      { label: 'for', detail: 'For loop', insertText: 'for (let i = 0; i < $0; i++)' },
      { label: 'while', detail: 'While loop', insertText: 'while ($0) {}' },
      { label: 'function', detail: 'Function declaration', insertText: 'function $0() {}' },
      { label: 'return', detail: 'Return statement' },
      { label: 'try', detail: 'Try statement', insertText: 'try {\n  $0\n} catch (error) {}' },
      { label: 'catch', detail: 'Catch clause', insertText: 'catch (error) {\n  $0\n}' },
      { label: 'finally', detail: 'Finally clause' },
      { label: 'throw', detail: 'Throw statement' },
      { label: 'new', detail: 'Create new instance' },
      { label: 'class', detail: 'Class declaration', insertText: 'class $0 {}' },
      { label: 'extends', detail: 'Extends keyword' },
      { label: 'import', detail: 'Import statement', insertText: 'import $0 from ""' },
      { label: 'export', detail: 'Export statement', insertText: 'export const $0 = () => {}' },
      { label: 'switch', detail: 'Switch statement', insertText: 'switch ($0) {}' },
      { label: 'case', detail: 'Case in switch' },
      { label: 'default', detail: 'Default case' }
    ];

    return keywords.map((kw, idx) => ({
      ...kw,
      kind: 'Keyword',
      icon: '⚡',
      sortText: `3_${String(idx).padStart(3, '0')}_${kw.label}`
    }));
  }

  /**
   * Get import completions
   */
  getImportCompletions(context) {
    return (context.availableImports || []).map(imp => ({
      label: imp.name,
      kind: 'Module',
      detail: `from ${imp.from}`,
      icon: '📦',
      sortText: `4_${imp.name}`
    }));
  }

  /**
   * Get property completions
   */
  getPropertyCompletions(context, content, lineNumber, column) {
    const line = content.split('\n')[lineNumber - 1] || '';
    const beforeCursor = line.substring(0, column);

    // Check if we're in a property access (object.property)
    const propertyMatch = beforeCursor.match(/(\w+)\.(\w*)$/);
    if (!propertyMatch) return [];

    const objectName = propertyMatch[1];
    const commonProperties = this.getObjectProperties(objectName);

    return commonProperties.map(prop => ({
      label: prop,
      kind: 'Property',
      icon: '◊',
      sortText: `5_${prop}`
    }));
  }

  /**
   * Get method completions
   */
  getMethodCompletions(context) {
    const commonMethods = [
      // Array methods
      { name: 'map', type: 'array', signature: 'map(callback)' },
      { name: 'filter', type: 'array', signature: 'filter(callback)' },
      { name: 'reduce', type: 'array', signature: 'reduce(callback, initial)' },
      { name: 'forEach', type: 'array', signature: 'forEach(callback)' },
      { name: 'find', type: 'array', signature: 'find(callback)' },
      { name: 'sort', type: 'array', signature: 'sort(compareFn)' },
      // String methods
      { name: 'split', type: 'string', signature: 'split(separator)' },
      { name: 'substring', type: 'string', signature: 'substring(start, end)' },
      { name: 'trim', type: 'string', signature: 'trim()' },
      { name: 'toLowerCase', type: 'string', signature: 'toLowerCase()' },
      { name: 'includes', type: 'string', signature: 'includes(searchString)' },
      // Object methods
      { name: 'keys', type: 'object', signature: 'keys(obj)' },
      { name: 'values', type: 'object', signature: 'values(obj)' },
      { name: 'entries', type: 'object', signature: 'entries(obj)' },
      { name: 'assign', type: 'object', signature: 'assign(target, source)' }
    ];

    return commonMethods.map(method => ({
      label: method.name,
      kind: 'Method',
      detail: method.signature,
      icon: 'ƒ',
      sortText: `6_${method.name}`
    }));
  }

  /**
   * Get snippet completions (code templates)
   */
  getSnippetCompletions(context) {
    const snippets = [
      {
        label: 'log',
        detail: 'console.log() statement',
        insertText: 'console.log($0);',
        kind: 'Snippet'
      },
      {
        label: 'arrow',
        detail: 'Arrow function',
        insertText: '($0) => {}',
        kind: 'Snippet'
      },
      {
        label: 'arrowAsync',
        detail: 'Async arrow function',
        insertText: 'async ($0) => {}',
        kind: 'Snippet'
      },
      {
        label: 'tryCatch',
        detail: 'Try-catch block',
        insertText: 'try {\n  $0\n} catch (error) {\n  console.error(error);\n}',
        kind: 'Snippet'
      },
      {
        label: 'ifelse',
        detail: 'If-else statement',
        insertText: 'if ($0) {\n  \n} else {\n  \n}',
        kind: 'Snippet'
      },
      {
        label: 'destructure',
        detail: 'Destructuring assignment',
        insertText: 'const { $0 } = obj;',
        kind: 'Snippet'
      },
      {
        label: 'jsx',
        detail: 'JSX element',
        insertText: '<$0 />',
        kind: 'Snippet'
      },
      {
        label: 'func',
        detail: 'Function declaration',
        insertText: 'function $0(${1:params}) {\n  ${2:// body}\n}',
        kind: 'Snippet'
      },
      {
        label: 'asyncFunc',
        detail: 'Async function',
        insertText: 'async function $0(${1:params}) {\n  ${2:// body}\n}',
        kind: 'Snippet'
      },
      {
        label: 'promise',
        detail: 'Promise pattern',
        insertText: 'new Promise((resolve, reject) => {\n  $0\n})',
        kind: 'Snippet'
      }
    ];

    return snippets.map((snippet, idx) => ({
      ...snippet,
      icon: '⚙',
      sortText: `7_${String(idx).padStart(3, '0')}_${snippet.label}`
    }));
  }

  /**
   * Get common object properties
   */
  getObjectProperties(objectName) {
    const properties = {
      'console': ['log', 'warn', 'error', 'info', 'debug', 'group', 'groupEnd', 'time', 'timeEnd'],
      'window': ['location', 'document', 'localStorage', 'sessionStorage', 'fetch', 'alert', 'confirm', 'prompt'],
      'document': ['getElementById', 'querySelector', 'querySelectorAll', 'createElement', 'body', 'head'],
      'localStorage': ['getItem', 'setItem', 'removeItem', 'clear', 'key'],
      'sessionStorage': ['getItem', 'setItem', 'removeItem', 'clear', 'key'],
      'Math': ['abs', 'ceil', 'floor', 'round', 'max', 'min', 'pow', 'sqrt', 'random', 'PI', 'E'],
      'JSON': ['parse', 'stringify'],
      'Object': ['keys', 'values', 'entries', 'assign', 'create', 'defineProperty'],
      'Array': ['isArray', 'from', 'of']
    };

    return properties[objectName] || [];
  }

  /**
   * Sort completions by relevance
   */
  sortCompletions(completions, context) {
    return completions.sort((a, b) => {
      // Primary sort by sortText
      if (a.sortText !== b.sortText) {
        return a.sortText.localeCompare(b.sortText);
      }
      // Secondary sort by label length (shorter is usually better)
      return a.label.length - b.label.length;
    });
  }

  /**
   * Resolve completion details (call after selection)
   */
  resolveCompletion(completion) {
    return {
      ...completion,
      documentation: this.getDocumentation(completion.label, completion.kind)
    };
  }

  /**
   * Get documentation for a symbol
   */
  getDocumentation(label, kind) {
    const docs = {
      'map': 'Creates a new array populated with the results of calling a provided function on every element.',
      'filter': 'Creates a shallow copy of a portion of a given array, filtered down to just the elements from the given array that pass the test.',
      'reduce': 'Executes a user-supplied "reducer" callback function on each element of the array (in order), passing in the return value from the calculation.',
      'forEach': 'Executes a provided function once for each array element.',
      'log': 'Outputs a message to the web console.',
      'fetch': 'Starts the process of fetching a resource from the network, returning a promise.',
      'JSON.parse': 'Parses a JSON string, constructing the JavaScript value or object described by the string.',
      'JSON.stringify': 'Returns a JSON string corresponding to the specified value.'
    };

    return {
      value: docs[label] || `Documentation for ${label}`,
      isTrusted: true
    };
  }

  /**
   * Handle completion selection
   */
  onCompletionSelected(completion, editor) {
    // Track for analytics
    const filePath = editor.filePath;
    if (!this.recentCompletions.has(filePath)) {
      this.recentCompletions.set(filePath, []);
    }
    this.recentCompletions.get(filePath).push({
      label: completion.label,
      timestamp: Date.now()
    });

    // Limit history
    if (this.recentCompletions.get(filePath).length > 100) {
      this.recentCompletions.get(filePath).shift();
    }
  }

  /**
   * Get completion statistics
   */
  getStatistics(filePath) {
    const completions = this.recentCompletions.get(filePath) || [];
    const frequency = new Map();

    completions.forEach(c => {
      frequency.set(c.label, (frequency.get(c.label) || 0) + 1);
    });

    return {
      totalCompletions: completions.length,
      uniqueCompletions: frequency.size,
      topCompletions: Array.from(frequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, count]) => ({ label, count }))
    };
  }

  /**
   * Clear completion cache
   */
  clearCache() {
    this.completionCache.clear();
  }

  /**
   * Clear file cache
   */
  clearFileCache(filePath) {
    for (const [key] of this.completionCache) {
      if (key.startsWith(filePath)) {
        this.completionCache.delete(key);
      }
    }
  }
}

const codeCompleter = new CodeCompleter();
export default codeCompleter;
