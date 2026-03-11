/**
 * AIChatManager - Conversational AI for coding assistance
 * Provides natural language chat interface with code context awareness
 */

class AIChatManager {
  constructor() {
    this.conversations = new Map(); // fileId -> [messages]
    this.contextStack = [];
    this.currentMode = 'coder';
  }

  /**
   * Set chat mode/personality
   */
  setMode(mode) {
    const modes = ['coder', 'debugger', 'teacher', 'reviewer'];
    if (modes.includes(mode)) {
      this.currentMode = mode;
      return true;
    }
    return false;
  }

  /**
   * Start a new conversation
   */
  startConversation(fileId) {
    this.conversations.set(fileId, [
      {
        role: 'system',
        content: `You are an expert code assistant in ${this.currentMode} mode.`,
        timestamp: Date.now()
      }
    ]);
    this.contextStack = [];
    return this.conversations.get(fileId);
  }

  /**
   * Add message to conversation
   */
  addMessage(fileId, role, content) {
    if (!this.conversations.has(fileId)) {
      this.startConversation(fileId);
    }

    const message = {
      role,
      content,
      timestamp: Date.now()
    };

    this.conversations.get(fileId).push(message);
    this.contextStack.push(message);

    // Keep conversation manageable
    const messages = this.conversations.get(fileId);
    if (messages.length > 50) {
      const system = messages[0];
      const recent = messages.slice(-48);
      this.conversations.set(fileId, [system, ...recent]);
    }

    return message;
  }

  /**
   * Process user query with code context
   */
  processQuery(fileId, userQuery, codeContext) {
    const message = this.addMessage(fileId, 'user', userQuery);
    const analysis = this.analyzeQuery(userQuery);
    const response = this.generateResponse(analysis, codeContext, userQuery);
    
    this.addMessage(fileId, 'assistant', response);

    return {
      message,
      response,
      analysis,
      suggestions: this.extractSuggestions(response),
      actions: this.suggestActions(analysis, codeContext)
    };
  }

  /**
   * Analyze user query intent
   */
  analyzeQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    return {
      type: this.detectQueryType(lowerQuery),
      isCodeRelated: /code|function|variable|loop|error|bug|fix|implement/.test(lowerQuery),
      isQuestion: query.trim().endsWith('?'),
      keywords: this.extractKeywords(query)
    };
  }

  /**
   * Detect query type
   */
  detectQueryType(query) {
    if (/error|bug|fix|debug|problem/.test(query)) return 'debugging';
    if (/explain|how|what is|understand/.test(query)) return 'explanation';
    if (/write|create|generate|code/.test(query)) return 'generation';
    if (/best practice|improve|refactor|clean/.test(query)) return 'optimization';
    if (/test|testing/.test(query)) return 'testing';
    return 'general';
  }

  /**
   * Extract keywords from query
   */
  extractKeywords(query) {
    const keywords = [];
    const patterns = [
      /\b(async|await|promise|callback|event|listener)\b/gi,
      /\b(array|object|string|number|boolean)\b/gi,
      /\b(function|class|method|variable)\b/gi
    ];

    patterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) {
        keywords.push(...matches.map(m => m.toLowerCase()));
      }
    });

    return [...new Set(keywords)];
  }

  /**
   * Generate response based on analysis
   */
  generateResponse(analysis, codeContext, userQuery) {
    switch (analysis.type) {
      case 'debugging':
        return this.generateDebugResponse(userQuery, codeContext);
      case 'explanation':
        return this.generateExplanationResponse(analysis.keywords);
      case 'generation':
        return this.generateCodeResponse(userQuery);
      case 'optimization':
        return this.generateOptimizationResponse(userQuery);
      default:
        return this.generateGeneralResponse(userQuery, codeContext);
    }
  }

  /**
   * Generate debugging response
   */
  generateDebugResponse(query, context) {
    return `I'll help you debug this! 🔍

**Steps to find the bug:**
1. Check the exact error message
2. Trace code execution flow
3. Add console.log() strategically
4. Verify function inputs/outputs
5. Test problematic code in isolation

${context ? `**Your context:** File has variables, functions, and potential issues to check.` : ''}

What error are you seeing?`;
  }

  /**
   * Generate explanation response
   */
  generateExplanationResponse(keywords) {
    const explanations = {
      'async': '⏱️ Async makes code non-blocking. Returns a Promise.',
      'await': '⏸️ Pauses until Promise resolves. Async-only.',
      'promise': '📌 Represents future value (pending/fulfilled/rejected).',
      'callback': '🔄 Function passed as argument, called later.',
      'function': '📦 Reusable code block.',
      'class': '🏗️ Blueprint for creating objects.',
      'array': '📋 Ordered list of values.',
      'object': '📌 Key-value pairs.'
    };

    let response = `Great question! 📚\n\n`;
    
    keywords.forEach(kw => {
      if (explanations[kw]) {
        response += `**${kw}:** ${explanations[kw]}\n`;
      }
    });

    return response || 'Ask me more specifically about what you want to understand!';
  }

  /**
   * Generate code response
   */
  generateCodeResponse(query) {
    return `I can help generate this! ✨

**What I need to know:**
1. Input parameters
2. Expected output
3. Any specific requirements

**You can also use:**
- "Generate" tab for templates
- "Agent" tab to auto-create code
- Describe the problem clearly

Ready to help - what code do you need?`;
  }

  /**
   * Generate optimization response
   */
  generateOptimizationResponse(query) {
    return `Great thinking about optimization! 🚀

**Best Practices:**
- Use const/let (not var)
- Prefer map/filter/reduce over loops
- Keep functions small and focused
- Separate concerns
- Add meaningful comments

**Performance Tips:**
- Cache computed values
- Use async for concurrent ops
- Avoid nested loops
- Minimize DOM updates

Use "Suggestions" tab to see specific improvements!`;
  }

  /**
   * Generate general response
   */
  generateGeneralResponse(query, context) {
    return `I'm here to help! 💻

I can assist with:
✅ Explaining concepts
✅ Debugging code
✅ Generating templates
✅ Optimizing code
✅ Best practices

What would you like help with?`;
  }

  /**
   * Extract suggestions from response
   */
  extractSuggestions(response) {
    const suggestions = [];
    const lines = response.split('\n');

    lines.forEach((line, idx) => {
      if (/^\d+\./.test(line.trim())) {
        suggestions.push({
          type: 'step',
          content: line.replace(/^\d+\.\s*/, '').trim(),
          index: idx
        });
      }
    });

    return suggestions;
  }

  /**
   * Suggest actions based on analysis
   */
  suggestActions(analysis, context) {
    const actions = [];

    if (analysis.type === 'debugging') {
      actions.push({
        type: 'analyze',
        label: 'Analyze Code',
        description: 'Run analysis to find errors'
      });
    }

    if (analysis.type === 'generation') {
      actions.push({
        type: 'generate',
        label: 'Generate Code',
        description: 'Use AI to generate code'
      });
    }

    if (analysis.type === 'optimization') {
      actions.push({
        type: 'refactor',
        label: 'Get Suggestions',
        description: 'See refactoring opportunities'
      });
    }

    return actions;
  }

  /**
   * Get conversation history
   */
  getConversation(fileId) {
    return this.conversations.get(fileId) || [];
  }

  /**
   * Clear conversation
   */
  clearConversation(fileId) {
    this.conversations.delete(fileId);
  }

  /**
   * Get modes
   */
  getModes() {
    return [
      { id: 'coder', name: '👨‍💻 Coder', desc: 'General coding help' },
      { id: 'debugger', name: '🔍 Debugger', desc: 'Finding and fixing bugs' },
      { id: 'teacher', name: '📚 Teacher', desc: 'Learning and explanation' },
      { id: 'reviewer', name: '👀 Reviewer', desc: 'Code review feedback' }
    ];
  }

  /**
   * Export conversation
   */
  exportConversation(fileId) {
    const conversation = this.getConversation(fileId);
    return {
      mode: this.currentMode,
      messages: conversation.filter(m => m.role !== 'system'),
      timestamp: Date.now()
    };
  }
}

const aiChatManager = new AIChatManager();
export default aiChatManager;
