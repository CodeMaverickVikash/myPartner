/**
 * AIAgent - Intelligent code generation, analysis, and refactoring
 * Provides "Better Agent" through smart code suggestions and transformations
 */

import aiContextManager from './AIContextManager.js';
import codeAnalyzer from './CodeAnalyzer.js';

class AIAgent {
  constructor() {
    this.suggestions = new Map(); // fileId -> [suggestions]
    this.generatedCode = new Map(); // request -> generated code
  }

  /**
   * Generate code from natural language description
   */
  generateCode(description, language = 'javascript', context = {}) {
    const { variables = [], functions = [], imports = [] } = context;

    // Parse the description to understand intent
    const intent = this.parseIntent(description);

    let generatedCode = '';

    switch (intent.type) {
      case 'function':
        generatedCode = this.generateFunction(intent.name, intent.params, intent.description);
        break;
      case 'component':
        generatedCode = this.generateComponent(intent.name, intent.props);
        break;
      case 'class':
        generatedCode = this.generateClass(intent.name, intent.methods);
        break;
      case 'utility':
        generatedCode = this.generateUtility(intent.name, intent.description);
        break;
      case 'hook':
        generatedCode = this.generateHook(intent.name, intent.description);
        break;
      default:
        generatedCode = this.generateGenericCode(description);
    }

    this.generatedCode.set(description, generatedCode);
    return {
      code: generatedCode,
      intent,
      suggestions: this.suggestImprovements(generatedCode)
    };
  }

  /**
   * Parse natural language to understand intent
   */
  parseIntent(description) {
    description = description.toLowerCase();

    if (description.includes('function') || description.includes('method')) {
      return { type: 'function', name: this.extractName(description), params: this.extractParams(description) };
    }
    if (description.includes('component') || description.includes('react')) {
      return { type: 'component', name: this.extractName(description), props: this.extractParams(description) };
    }
    if (description.includes('class')) {
      return { type: 'class', name: this.extractName(description), methods: this.extractParams(description) };
    }
    if (description.includes('hook') || description.includes('use ')) {
      return { type: 'hook', name: this.extractName(description) };
    }
    if (description.includes('utility') || description.includes('helper')) {
      return { type: 'utility', name: this.extractName(description) };
    }

    return { type: 'generic', description };
  }

  /**
   * Extract function/component name from description
   */
  extractName(description) {
    const match = description.match(/(?:function|component|class)\s+named\s+(\w+)/i) ||
                 description.match(/(?:called|named)\s+(\w+)/i) ||
                 description.match(/(\w+)\s+(?:function|component|class)/i);
    return match ? match[1] : 'generated';
  }

  /**
   * Extract parameters from description
   */
  extractParams(description) {
    const paramMatch = description.match(/(?:with|takes?|accepts?|parameters?:?\s*)([^.]+)/i);
    if (!paramMatch) return [];

    return paramMatch[1]
      .split(/[,and]+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  /**
   * Generate a function from description
   */
  generateFunction(name, params = [], description = '') {
    const paramList = params.join(', ') || 'params';
    const jsDoc = description ? `/**\n * ${description}\n */\n` : '';

    return `${jsDoc}export const ${name} = (${paramList}) => {
  // TODO: Implement ${name}
  return null;
};`;
  }

  /**
   * Generate a React component
   */
  generateComponent(name, props = []) {
    const propList = props.length > 0 ? `{\n    ${props.join(',\n    ')}\n  }` : 'props';

    return `import React from 'react';

/**
 * ${name} Component
 */
export const ${name} = (${propList}) => {
  return (
    <div className="component-${name.toLowerCase()}">
      {/* TODO: Implement ${name} */}
    </div>
  );
};

export default ${name};`;
  }

  /**
   * Generate a class
   */
  generateClass(name, methods = []) {
    const methodList = methods.map(m => `  ${m}() {\n    // TODO: Implement\n  }`).join('\n\n');

    return `/**
 * ${name} Class
 */
export class ${name} {
  constructor() {
    // TODO: Initialize
  }

${methodList || '  // TODO: Add methods'}
}`;
  }

  /**
   * Generate a utility function
   */
  generateUtility(name, description) {
    return `/**
 * ${description || name}
 */
export const ${name} = (input) => {
  try {
    // TODO: Implement utility
    return input;
  } catch (error) {
    console.error('Error in ${name}:', error);
    throw error;
  }
};`;
  }

  /**
   * Generate a React hook
   */
  generateHook(name, description) {
    return `import { useState, useEffect } from 'react';

/**
 * ${description || name} Hook
 */
export const ${name} = (initialValue) => {
  const [state, setState] = useState(initialValue);

  useEffect(() => {
    // TODO: Implement effect
  }, [state]);

  return [state, setState];
};`;
  }

  /**
   * Generate generic code
   */
  generateGenericCode(description) {
    return `// TODO: Implement based on description
// ${description}
export const generated = () => {
  // Implementation here
};`;
  }

  /**
   * Suggest code improvements
   */
  suggestImprovements(code) {
    const suggestions = [];

    // Check for TODO comments
    const todoRegex = /\/\/\s*TODO:?\s*(.+)/g;
    let match;
    while ((match = todoRegex.exec(code)) !== null) {
      suggestions.push({
        type: 'todo',
        message: match[1],
        line: code.substring(0, match.index).split('\n').length
      });
    }

    // Suggest error handling
    if (code.includes('.then') && !code.includes('.catch')) {
      suggestions.push({
        type: 'improvement',
        message: 'Add error handling with .catch()',
        line: code.indexOf('.then')
      });
    }

    // Suggest JSDoc
    if (code.includes('function') && !code.includes('/**')) {
      suggestions.push({
        type: 'improvement',
        message: 'Add JSDoc comments for documentation'
      });
    }

    return suggestions;
  }

  /**
   * Suggest refactoring improvements
   */
  suggestRefactoring(filePath, content) {
    const suggestions = [];
    const lines = content.split('\n');

    // Detect functions that are too long
    let functionStart = -1;
    let functionLength = 0;

    lines.forEach((line, idx) => {
      if (/function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>|=>/.test(line)) {
        functionStart = idx;
        functionLength = 1;
      } else if (functionStart >= 0) {
        functionLength++;
        if (line.trim() === '}' && functionLength > 30) {
          suggestions.push({
            type: 'refactor',
            title: 'Function too long',
            description: `Function starting at line ${functionStart + 1} is ${functionLength} lines. Consider splitting it into smaller functions.`,
            startLine: functionStart + 1,
            endLine: idx + 1
          });
          functionStart = -1;
        }
      }
    });

    // Detect duplicate code patterns
    const linePatterns = lines.map(l => l.trim()).filter(l => l.length > 10);
    const duplicates = new Map();

    linePatterns.forEach((pattern, idx) => {
      if (duplicates.has(pattern)) {
        duplicates.get(pattern).push(idx);
      } else {
        duplicates.set(pattern, [idx]);
      }
    });

    duplicates.forEach((indices, pattern) => {
      if (indices.length > 1) {
        suggestions.push({
          type: 'refactor',
          title: 'Duplicate code detected',
          description: `Similar code appears on lines ${indices.map(i => i + 1).join(', ')}. Consider extracting into a function.`,
          severity: 'medium'
        });
      }
    });

    // Suggest variable extraction
    lines.forEach((line, idx) => {
      if (line.length > 120) {
        suggestions.push({
          type: 'refactor',
          title: 'Extract variable',
          description: `Line ${idx + 1} is too long (${line.length} chars). Consider extracting complex expressions into variables.`,
          startLine: idx + 1
        });
      }
    });

    return suggestions;
  }

  /**
   * Apply automatic refactoring
   */
  applyRefactoring(code, refactoringType) {
    switch (refactoringType) {
      case 'extraVariables':
        return this.extractVariables(code);
      case 'extractFunctions':
        return this.extractFunctions(code);
      case 'simplifyLogic':
        return this.simplifyLogic(code);
      case 'removeDeadCode':
        return this.removeDeadCode(code);
      default:
        return code;
    }
  }

  /**
   * Extract long expressions into variables
   */
  extractVariables(code) {
    // Replace long expressions with variables
    let refactored = code;
    const complexRegex = /(\w+\[\w+\]\.[\w.]+\(.*\))/g;

    let varCount = 0;
    refactored = refactored.replace(complexRegex, (match) => {
      varCount++;
      return `complexExpression${varCount}`;
    });

    return refactored;
  }

  /**
   * Extract repeated code into functions
   */
  extractFunctions(code) {
    // Identify repeated blocks and suggest extraction
    return code; // Advanced NLP required
  }

  /**
   * Simplify complex logic
   */
  simplifyLogic(code) {
    // Convert nested ternary to if/else
    let refactored = code.replace(
      /(\w+)\s*\?\s*(\w+)\s*:\s*(\w+)\s*\?\s*(\w+)\s*:\s*(\w+)/g,
      'if ($1) { $2 } else if ($3) { $4 } else { $5 }'
    );

    // Convert if (condition) return a; else return b; to return condition ? a : b;
    refactored = refactored.replace(
      /if\s*\((.*?)\)\s*return\s*(.*?);\s*else\s*return\s*(.*?);/g,
      'return ($1) ? $2 : $3;'
    );

    return refactored;
  }

  /**
   * Remove dead code
   */
  removeDeadCode(code) {
    const lines = code.split('\n');
    const active = new Array(lines.length).fill(true);
    let inDeadCode = false;

    lines.forEach((line, idx) => {
      if (line.includes('if (false)') || line.includes('if (0)')) {
        inDeadCode = true;
        active[idx] = false;
      } else if (inDeadCode && line.trim() === '}') {
        active[idx] = false;
        inDeadCode = false;
      } else if (inDeadCode) {
        active[idx] = false;
      }
    });

    return lines.filter((_, idx) => active[idx]).join('\n');
  }

  /**
   * Get suggestions for a file
   */
  getSuggestions(filePath) {
    return this.suggestions.get(filePath) || [];
  }

  /**
   * Clear suggestions for a file
   */
  clearSuggestions(filePath) {
    this.suggestions.delete(filePath);
  }
}

const aiAgent = new AIAgent();
export default aiAgent;
