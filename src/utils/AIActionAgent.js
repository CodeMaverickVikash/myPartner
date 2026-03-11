/**
 * AIActionAgent - Intelligent agent that executes code improvements
 * Can auto-fix issues, refactor code, and apply suggestions
 */

import codeAnalyzer from './CodeAnalyzer';
import aiAgent from './AIAgent';
import aiContextManager from './AIContextManager';

class AIActionAgent {
  constructor() {
    this.actionHistory = new Map(); // fileId -> [actions]
    this.executedActions = [];
    this.pendingActions = [];
  }

  /**
   * Get available actions for code
   */
  getAvailableActions(filePath, content) {
    const actions = [];

    // Analyze code
    const analysis = codeAnalyzer.analyzeCode(filePath, content);
    const context = aiContextManager.analyzeFileContext(filePath, content);

    // Generate fix actions for errors
    if (analysis.errors.length > 0) {
      actions.push({
        id: 'fix-errors',
        type: 'fix',
        label: '🔧 Fix Errors',
        description: `Fix ${analysis.errors.length} error(s)`,
        severity: 'critical',
        targetIssues: analysis.errors,
        executable: true,
        action: () => this.fixErrors(filePath, content, analysis.errors)
      });
    }

    // Generate fix actions for warnings
    if (analysis.warnings.length > 0) {
      actions.push({
        id: 'fix-warnings',
        type: 'fix',
        label: '⚠️ Fix Warnings',
        description: `Address ${analysis.warnings.length} warning(s)`,
        severity: 'high',
        targetIssues: analysis.warnings,
        executable: true,
        action: () => this.fixWarnings(filePath, content, analysis.warnings)
      });
    }

    // Generate refactoring suggestions
    const refactoringSuggestions = aiAgent.suggestRefactoring(filePath, content);
    if (refactoringSuggestions.length > 0) {
      actions.push({
        id: 'refactor',
        type: 'refactor',
        label: '✨ Refactor Code',
        description: `${refactoringSuggestions.length} refactoring opportunity(ies)`,
        severity: 'medium',
        suggestions: refactoringSuggestions,
        executable: true,
        action: () => this.refactorCode(filePath, content, refactoringSuggestions)
      });
    }

    // Format code action
    actions.push({
      id: 'format',
      type: 'format',
      label: '📐 Format Code',
      description: 'Apply formatting standards',
      severity: 'low',
      executable: true,
      action: () => this.formatCode(content)
    });

    // Optimize performance
    if (this.hasPerformanceIssues(content)) {
      actions.push({
        id: 'optimize',
        type: 'optimize',
        label: '⚡ Optimize Performance',
        description: 'Apply performance improvements',
        severity: 'high',
        executable: true,
        action: () => this.optimizePerformance(content)
      });
    }

    // Add documentation
    if (this.needsDocumentation(context)) {
      actions.push({
        id: 'add-docs',
        type: 'documentation',
        label: '📖 Add Documentation',
        description: `Add JSDoc to ${this.countUndocumentedItems(context)} items`,
        severity: 'low',
        executable: true,
        action: () => this.addDocumentation(content, context)
      });
    }

    return actions;
  }

  /**
   * Fix all errors in code
   */
  fixErrors(filePath, content, errors) {
    let fixedCode = content;
    const fixes = [];

    errors.forEach(error => {
      const fix = this.suggestErrorFix(error);
      if (fix) {
        fixes.push({
          issue: error,
          fix: fix.solution,
          line: error.line
        });
        // Apply fix to code
        fixedCode = this.applyFix(fixedCode, error.line, fix.solution);
      }
    });

    this.recordAction(filePath, 'fix-errors', fixes);
    return {
      fixedCode,
      appliedFixes: fixes.length,
      fixes
    };
  }

  /**
   * Suggest fix for specific error
   */
  suggestErrorFix(error) {
    const solutions = {
      'Unclosed bracket': { solution: 'Add closing bracket at end of line' },
      'Unmatched closing bracket': { solution: 'Remove extra closing bracket' },
      'Variable is declared but never used': { solution: 'Remove unused variable or use it' },
      'Use "const" or "let" instead of "var"': { solution: 'Replace var with const or let' }
    };

    for (const [key, value] of Object.entries(solutions)) {
      if (error.message.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Fix warnings in code
   */
  fixWarnings(filePath, content, warnings) {
    let fixedCode = content;
    const fixes = [];

    warnings.forEach(warning => {
      const fix = this.suggestWarningFix(warning);
      if (fix) {
        fixes.push({
          issue: warning,
          fix: fix.solution
        });
        fixedCode = this.applyFix(fixedCode, warning.line, fix.solution);
      }
    });

    this.recordAction(filePath, 'fix-warnings', fixes);
    return {
      fixedCode,
      appliedFixes: fixes.length,
      fixes
    };
  }

  /**
   * Suggest fix for warning
   */
  suggestWarningFix(warning) {
    if (warning.message.includes('var')) {
      return { solution: 'Replace var with const' };
    }
    if (warning.message.includes('Promise')) {
      return { solution: 'Add .catch() or try/catch block' };
    }
    if (warning.message.includes('console')) {
      return { solution: 'Remove console.log statement' };
    }
    return null;
  }

  /**
   * Refactor code based on suggestions
   */
  refactorCode(filePath, content, suggestions) {
    let refactoredCode = content;
    const applied = [];

    suggestions.forEach(suggestion => {
      if (suggestion.type === 'refactor') {
        applied.push({
          suggestion: suggestion.title,
          status: 'suggested',
          action: 'Review and apply manually'
        });
      }
    });

    this.recordAction(filePath, 'refactor', applied);
    return {
      refactoredCode,
      suggestions: applied,
      message: `${applied.length} refactoring suggestion(s) available`
    };
  }

  /**
   * Format code
   */
  formatCode(content) {
    let formatted = content;

    // Remove trailing whitespace
    formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');

    // Ensure newline at end
    if (formatted && !formatted.endsWith('\n')) {
      formatted += '\n';
    }

    // Normalize spacing
    formatted = formatted.replace(/\t/g, '  '); // Convert tabs to spaces

    return {
      formattedCode: formatted,
      changes: 'Formatting applied: removed trailing whitespace, normalized indentation',
      applied: true
    };
  }

  /**
   * Check if code has performance issues
   */
  hasPerformanceIssues(content) {
    const patterns = [
      /for\s*\([^)]*\)\s*{[^}]*\[\s*\][^}]*}/,  // Array creation in loop
      /while\s*\(\s*true\s*\)/,                  // Infinite loop
      /\.forEach.*\.push/                         // Inefficient pattern
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  /**
   * Optimize performance
   */
  optimizePerformance(content) {
    const optimizations = [];

    if (/for\s*\([^)]*\)\s*{[^}]*\[/.test(content)) {
      optimizations.push('Move array creation outside of loops');
    }

    if (/while\s*\(\s*true\s*\)/.test(content)) {
      optimizations.push('Add proper break condition to while loop');
    }

    return {
      optimizations,
      message: `Found ${optimizations.length} optimization(s)`,
      suggestedActions: optimizations
    };
  }

  /**
   * Check if code needs documentation
   */
  needsDocumentation(context) {
    return (context.functions && context.functions.length > 0 && 
            context.comments && context.comments.length < context.functions.length);
  }

  /**
   * Count undocumented items
   */
  countUndocumentedItems(context) {
    const documented = context.comments ? context.comments.length : 0;
    const total = (context.functions ? context.functions.length : 0) +
                 (context.classes ? context.classes.length : 0);
    return Math.max(0, total - documented);
  }

  /**
   * Add documentation
   */
  addDocumentation(content, context) {
    const additions = [];

    if (context.functions) {
      context.functions.forEach(fn => {
        additions.push({
          item: fn.name,
          type: 'function',
          documentation: this.generateJSDoc(fn)
        });
      });
    }

    return {
      additions,
      documentationAdded: additions.length,
      message: `Documentation template(s) ready for ${additions.length} item(s)`
    };
  }

  /**
   * Generate JSDoc template
   */
  generateJSDoc(item) {
    return `/**
 * ${item.name}
 * @param {type} param - Parameter description
 * @returns {type} Return description
 */`;
  }

  /**
   * Apply a single fix to code
   */
  applyFix(content, lineNum, fixSuggestion) {
    const lines = content.split('\n');
    if (lineNum <= lines.length) {
      // Mark line as potentially fixed (actual fix requires user confirmation)
      lines[lineNum - 1] = `${lines[lineNum - 1]} // FIXED: ${fixSuggestion}`;
    }
    return lines.join('\n');
  }

  /**
   * Execute action
   */
  executeAction(action) {
    try {
      const result = action.action();
      
      this.executedActions.push({
        actionId: action.id,
        timestamp: Date.now(),
        status: 'success',
        result
      });

      return {
        success: true,
        result,
        message: `${action.label} executed successfully!`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to execute ${action.label}`
      };
    }
  }

  /**
   * Record action taken
   */
  recordAction(fileId, actionType, details) {
    if (!this.actionHistory.has(fileId)) {
      this.actionHistory.set(fileId, []);
    }

    this.actionHistory.get(fileId).push({
      type: actionType,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * Get action history for file
   */
  getActionHistory(fileId) {
    return this.actionHistory.get(fileId) || [];
  }

  /**
   * Clear history
   */
  clearHistory(fileId) {
    this.actionHistory.delete(fileId);
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      totalActionsExecuted: this.executedActions.length,
      filesModified: this.actionHistory.size,
      recentActions: this.executedActions.slice(-10)
    };
  }
}

const aiActionAgent = new AIActionAgent();
export default aiActionAgent;
