/**
 * CodeAnalyzer - Real-time code analysis and quality detection
 * Provides "Better Code" through intelligent error detection and suggestions
 */

class CodeAnalyzer {
  constructor() {
    this.issues = new Map(); // filePath -> [issues]
    this.warnings = new Map();
    this.suggestions = new Map();
  }

  /**
   * Analyze code for errors, warnings, and suggestions
   */
  analyzeCode(filePath, content) {
    const issues = {
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Run all analysis rules
    this.checkSyntaxErrors(content, issues);
    this.checkUnusedVariables(content, issues);
    this.checkImportIssues(content, issues);
    this.checkCodeStyle(content, issues);
    this.checkPerformance(content, issues);
    this.checkSecurity(content, issues);
    this.checkBestPractices(content, issues);

    this.issues.set(filePath, issues.errors);
    this.warnings.set(filePath, issues.warnings);
    this.suggestions.set(filePath, issues.suggestions);

    return issues;
  }

  /**
   * Check for syntax errors
   */
  checkSyntaxErrors(content, issues) {
    // Check for unclosed brackets
    const brackets = { '{': '}', '[': ']', '(': ')' };
    const stack = [];
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      let inString = false;
      let stringChar = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        // Track strings
        if ((char === '"' || char === "'" || char === '`') && line[i - 1] !== '\\') {
          if (!inString) {
            inString = true;
            stringChar = char;
          } else if (char === stringChar) {
            inString = false;
          }
          continue;
        }

        if (inString) continue;

        if (brackets[char]) {
          stack.push({ char, line: lineNum + 1 });
        } else if (Object.values(brackets).includes(char)) {
          if (stack.length === 0 || brackets[stack[stack.length - 1].char] !== char) {
            issues.errors.push({
              line: lineNum + 1,
              column: i + 1,
              message: `Unmatched closing bracket "${char}"`,
              severity: 'error',
              fix: 'Remove this bracket'
            });
          } else {
            stack.pop();
          }
        }
      }
    });

    // Report unclosed brackets
    stack.forEach(bracket => {
      issues.errors.push({
        line: bracket.line,
        message: `Unclosed bracket "${bracket.char}"`,
        severity: 'error',
        fix: `Add closing bracket "${brackets[bracket.char]}"`
      });
    });
  }

  /**
   * Check for unused variables
   */
  checkUnusedVariables(content, issues) {
    const varRegex = /(?:const|let|var)\s+(\w+)\s*=/g;
    const lines = content.split('\n');
    let match;

    while ((match = varRegex.exec(content)) !== null) {
      const varName = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;
      
      // Skip common patterns (_, __, unused, etc.)
      if (varName.startsWith('_')) return;

      // Check if variable is used after definition
      const afterDef = content.substring(match.index + match[0].length);
      const usageRegex = new RegExp(`\\b${varName}\\b`);

      if (!usageRegex.test(afterDef)) {
        issues.warnings.push({
          line: lineNum,
          message: `Variable "${varName}" is declared but never used`,
          severity: 'warning',
          fix: `Use "${varName}" or remove it`
        });
      }
    }
  }

  /**
   * Check for import/export issues
   */
  checkImportIssues(content, issues) {
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const modulePath = match[1];
      const lineNum = content.substring(0, match.index).split('\n').length;

      // Check for relative path that looks wrong
      if (modulePath.startsWith('.') && !modulePath.match(/^\.{1,2}\//) && !modulePath.includes('node_modules')) {
        issues.suggestions.push({
          line: lineNum,
          message: `Consider using absolute or correct relative path for "${modulePath}"`,
          severity: 'info',
          fix: 'Verify the import path is correct'
        });
      }
    }
  }

  /**
   * Check code style issues
   */
  checkCodeStyle(content, issues) {
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      // Check for trailing whitespace
      if (line.length > 0 && /\s+$/.test(line)) {
        issues.suggestions.push({
          line: lineNum + 1,
          message: 'Trailing whitespace detected',
          severity: 'info',
          fix: 'Remove trailing whitespace'
        });
      }

      // Check for multiple var declarations (should use const/let)
      if (/var\s+/.test(line)) {
        issues.warnings.push({
          line: lineNum + 1,
          message: 'Use "const" or "let" instead of "var"',
          severity: 'warning',
          fix: 'Replace "var" with "const" or "let"'
        });
      }

      // Check for console.log in production code
      if (/console\.(log|warn|error)\s*\(/.test(line) && !line.trim().startsWith('//')) {
        issues.suggestions.push({
          line: lineNum + 1,
          message: 'Remove console statement before production',
          severity: 'info',
          fix: 'Remove or comment out console statement'
        });
      }

      // Check for debugger statement
      if (/\bdebugger\b/.test(line) && !line.trim().startsWith('//')) {
        issues.warnings.push({
          line: lineNum + 1,
          message: 'Debugger statement detected',
          severity: 'warning',
          fix: 'Remove debugger statement'
        });
      }
    });
  }

  /**
   * Check for performance issues
   */
  checkPerformance(content, issues) {
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      // Check for large objects/arrays in loops
      if (/for\s*\(|while\s*\(/.test(line) && lineNum < lines.length - 1) {
        const nextLines = lines.slice(lineNum, Math.min(lineNum + 5, lines.length)).join('\n');
        if (/\[.*\]|\{.*\}/.test(nextLines) && nextLines.includes('.push') || nextLines.includes('.concat')) {
          issues.suggestions.push({
            line: lineNum + 1,
            message: 'Consider moving object/array creation outside the loop',
            severity: 'info',
            fix: 'Refactor to create objects/arrays outside loop'
          });
        }
      }

      // Check for potential infinite loops
      if (/while\s*\(\s*true\s*\)/.test(line)) {
        issues.warnings.push({
          line: lineNum + 1,
          message: 'Infinite loop detected (while true)',
          severity: 'warning',
          fix: 'Add proper break condition'
        });
      }
    });
  }

  /**
   * Check for security issues
   */
  checkSecurity(content, issues) {
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      // Check for eval usage
      if (/\beval\s*\(/.test(line)) {
        issues.errors.push({
          line: lineNum + 1,
          message: 'eval() is a security risk',
          severity: 'error',
          fix: 'Avoid using eval(), use alternative approach'
        });
      }

      // Check for innerHTML (XSS risk)
      if (/\.innerHTML\s*=/.test(line)) {
        issues.warnings.push({
          line: lineNum + 1,
          message: 'innerHTML can cause XSS vulnerabilities',
          severity: 'warning',
          fix: 'Use textContent or createElement for safer DOM manipulation'
        });
      }

      // Check for hardcoded credentials
      if (/password|token|secret|api.?key|apikey/i.test(line) && /['"][^'"]{5,}['"]/.test(line)) {
        issues.errors.push({
          line: lineNum + 1,
          message: 'Possible hardcoded credentials detected',
          severity: 'error',
          fix: 'Move credentials to environment variables'
        });
      }
    });
  }

  /**
   * Check for best practices
   */
  checkBestPractices(content, issues) {
    const lines = content.split('\n');

    lines.forEach((line, lineNum) => {
      // Check for missing error handling
      if (/\.then\(/.test(line) && !content.includes('.catch')) {
        issues.suggestions.push({
          line: lineNum + 1,
          message: 'Promise without error handling',
          severity: 'info',
          fix: 'Add .catch() or use try/catch'
        });
      }

      // Check for too long lines
      if (line.length > 100) {
        issues.suggestions.push({
          line: lineNum + 1,
          message: `Line is ${line.length} characters (recommended max 100)`,
          severity: 'info',
          fix: 'Split long line into multiple lines'
        });
      }

      // Check for missing semicolons (if using semicolon style)
      if (/[a-zA-Z0-9_\]}\)]\s*$/.test(line) && !line.includes('{') && !line.includes('(') && !line.trim().startsWith('//')) {
        const hasJSKeyword = /\b(if|else|for|while|try|catch|function|class|switch|case)\b/.test(line);
        if (!hasJSKeyword && line.trim() && !line.includes('=>')) {
          // Could suggest semicolon, but modern JS doesn't require it
        }
      }
    });
  }

  /**
   * Get all issues for a file
   */
  getIssues(filePath) {
    return {
      errors: this.issues.get(filePath) || [],
      warnings: this.warnings.get(filePath) || [],
      suggestions: this.suggestions.get(filePath) || []
    };
  }

  /**
   * Get issues by severity level
   */
  getIssuesBySeverity(filePath, severity) {
    const allIssues = this.getIssues(filePath);
    const severityKey = severity.toLowerCase() + 's'; // 'error' -> 'errors'
    return allIssues[severityKey] || [];
  }

  /**
   * Get summary statistics
   */
  getSummary(filePath) {
    const issues = this.getIssues(filePath);
    return {
      totalIssues: issues.errors.length + issues.warnings.length + issues.suggestions.length,
      errorCount: issues.errors.length,
      warningCount: issues.warnings.length,
      suggestionCount: issues.suggestions.length,
      quality: this.calculateQualityScore(issues)
    };
  }

  /**
   * Calculate code quality score (0-100)
   */
  calculateQualityScore(issues) {
    let score = 100;
    score -= issues.errors.length * 10;
    score -= issues.warnings.length * 3;
    score -= issues.suggestions.length * 1;
    return Math.max(0, score);
  }

  /**
   * Clear analysis for a file
   */
  clearAnalysis(filePath) {
    this.issues.delete(filePath);
    this.warnings.delete(filePath);
    this.suggestions.delete(filePath);
  }
}

const codeAnalyzer = new CodeAnalyzer();
export default codeAnalyzer;
