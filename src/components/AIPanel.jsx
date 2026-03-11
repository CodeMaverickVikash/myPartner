import React, { useState, useEffect } from 'react';
import aiContextManager from '../utils/AIContextManager';
import codeAnalyzer from '../utils/CodeAnalyzer';
import aiAgent from '../utils/AIAgent';
import codeCompleter from '../utils/CodeCompleter';
import aiChatManager from '../utils/AIChatManager';
import aiActionAgent from '../utils/AIActionAgent';
import { toast } from 'react-hot-toast';
import '../styles/AIPanel.css';

/**
 * AIPanel - Comprehensive AI-powered coding assistant
 * Integrates Better Context, Better Agent, and Better Code features
 */
const AIPanel = ({ isOpen, onClose, currentFile, editorContent, editorPosition }) => {
  const [activeTab, setActiveTab] = useState('suggestions'); // suggestions, generate, analyze, complete, chat, agent
  const [suggestions, setSuggestions] = useState([]);
  const [generatedCode, setGeneratedCode] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatMode, setChatMode] = useState('coder'); // coder, debugger, teacher, reviewer
  const [chatLoading, setChatLoading] = useState(false);
  // Agent state
  const [availableActions, setAvailableActions] = useState([]);
  const [actionHistory, setActionHistory] = useState([]);
  const [executedActions, setExecutedActions] = useState([]);

  // Analyze code whenever file changes
  useEffect(() => {
    if (currentFile && editorContent) {
      const results = codeAnalyzer.analyzeCode(currentFile, editorContent);
      setAnalysisResults(results);
      
      // Get comprehensive suggestions
      const refactoringSuggestions = aiAgent.suggestRefactoring(currentFile, editorContent);
      setSuggestions(refactoringSuggestions);

      // Get available actions for this file
      const actions = aiActionAgent.getAvailableActions(currentFile, editorContent);
      setAvailableActions(actions);

      // Initialize chat for this file if not already started
      if (!chatMessages.length) {
        aiChatManager.startConversation(currentFile);
      }
    }
  }, [currentFile, editorContent]);

  /**
   * Generate code from user description
   */
  const handleGenerateCode = async () => {
    if (!userInput.trim()) {
      toast.error('Please describe what code you want to generate');
      return;
    }

    setLoading(true);
    try {
      const context = aiContextManager.getCompletionContext(
        currentFile,
        editorPosition?.line || 1,
        editorPosition?.column || 0,
        editorContent || ''
      );

      const result = aiAgent.generateCode(userInput, 'javascript', context);
      setGeneratedCode(result.code);
      
      toast.success('Code generated! Copy and paste into your editor.');
    } catch (error) {
      toast.error('Failed to generate code: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get smart completions
   */
  const handleGetCompletions = () => {
    if (!currentFile) return;

    const comps = codeCompleter.getCompletions(
      currentFile,
      editorContent,
      editorPosition?.line || 1,
      editorPosition?.column || 0
    );

    setCompletions(comps.slice(0, 15));
  };

  /**
   * Copy generated code to clipboard
   */
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Code copied to clipboard!');
  };

  /**
   * Apply refactoring suggestion
   */
  const handleApplyRefactoring = (suggestion) => {
    if (suggestion.type === 'refactor') {
      toast.info(`Refactoring suggestion: ${suggestion.title}`);
      // In a full implementation, this would update the editor
    }
  };

  /**
   * Handle chat mode change
   */
  const handleChangeChatMode = (mode) => {
    setChatMode(mode);
    aiChatManager.setMode(mode);
    toast.success(`Switched to ${mode} mode`);
  };

  /**
   * Send chat message
   */
  const handleSendChat = async () => {
    if (!chatInput.trim()) {
      toast.error('Please type a message');
      return;
    }

    if (!currentFile) {
      toast.error('Open a file to chat about');
      return;
    }

    setChatLoading(true);
    try {
      // Add user message
      const userMsg = {
        role: 'user',
        content: chatInput,
        timestamp: Date.now()
      };
      
      aiChatManager.addMessage(currentFile, 'user', chatInput);
      setChatMessages(prev => [...prev, userMsg]);

      // Get AI response
      const context = aiContextManager.analyzeFileContext(currentFile, editorContent || '');
      const result = aiChatManager.processQuery(currentFile, chatInput, {
        code: editorContent,
        context: context,
        line: editorPosition?.line || 1,
        column: editorPosition?.column || 0
      });

      // Add AI message
      const aiMsg = {
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
        suggestions: result.suggestions,
        actions: result.actions
      };

      aiChatManager.addMessage(currentFile, 'assistant', result.response);
      setChatMessages(prev => [...prev, aiMsg]);

      setChatInput('');
      toast.success('Response received!');
    } catch (error) {
      toast.error('Failed to send message: ' + error.message);
    } finally {
      setChatLoading(false);
    }
  };

  /**
   * Execute an action
   */
  const handleExecuteAction = (action) => {
    try {
      const result = aiActionAgent.executeAction(action);
      
      if (result.success) {
        const executedAction = {
          actionId: action.id,
          label: action.label,
          status: 'success',
          timestamp: Date.now(),
          result: result.result
        };
        
        setExecutedActions(prev => [...prev, executedAction]);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to execute action: ' + error.message);
    }
  };

  /**
   * Get action icon based on type
   */
  const getActionIcon = (action) => {
    const icons = {
      'fix': '🔧',
      'refactor': '✨',
      'format': '📐',
      'optimize': '⚡',
      'documentation': '📖'
    };
    return icons[action.type] || '⚙️';
  };

  if (!isOpen) return null;

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <h3 className="ai-panel-title">
          <span className="ai-icon">⚡</span> AI Assistant
        </h3>
        <button className="ai-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Tab Navigation */}
      <div className="ai-tabs">
        <button
          className={`ai-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          💡 Suggestions
        </button>
        <button
          className={`ai-tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          ✨ Generate
        </button>
        <button
          className={`ai-tab ${activeTab === 'analyze' ? 'active' : ''}`}
          onClick={() => setActiveTab('analyze')}
        >
          🔍 Analyze
        </button>
        <button
          className={`ai-tab ${activeTab === 'complete' ? 'active' : ''}`}
          onClick={() => setActiveTab('complete')}
        >
          ⌨ Complete
        </button>
        <button
          className={`ai-tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
        <button
          className={`ai-tab ${activeTab === 'agent' ? 'active' : ''}`}
          onClick={() => setActiveTab('agent')}
        >
          🤖 Agent
        </button>
      </div>

      {/* Panel Content */}
      <div className="ai-panel-content">
        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="ai-section">
            <h4>Refactoring Suggestions</h4>
            {suggestions.length === 0 ? (
              <p className="ai-empty">No suggestions at the moment. Your code looks good!</p>
            ) : (
              <div className="ai-suggestions-list">
                {suggestions.map((suggestion, idx) => (
                  <div key={idx} className="ai-suggestion-item">
                    <div className="suggestion-header">
                      <span className="suggestion-title">{suggestion.title}</span>
                      <span className={`suggestion-severity ${suggestion.type}`}>
                        {suggestion.type}
                      </span>
                    </div>
                    <p className="suggestion-description">{suggestion.description}</p>
                    <button
                      className="suggestion-apply-btn"
                      onClick={() => handleApplyRefactoring(suggestion)}
                    >
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generate Code Tab */}
        {activeTab === 'generate' && (
          <div className="ai-section">
            <h4>Generate Code</h4>
            <p className="ai-help-text">Describe what code you want to generate</p>
            
            <textarea
              className="ai-input"
              placeholder="e.g., 'function to validate email addresses' or 'react component for user profile card'"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              rows={3}
            />
            
            <button
              className="ai-action-btn generate-btn"
              onClick={handleGenerateCode}
              disabled={loading}
            >
              {loading ? '⏳ Generating...' : '✨ Generate Code'}
            </button>

            {generatedCode && (
              <div className="ai-generated-code">
                <div className="generated-header">
                  <h5>Generated Code</h5>
                  <button className="copy-btn" onClick={handleCopyCode}>
                    📋 Copy
                  </button>
                </div>
                <pre className="code-preview">
                  <code>{generatedCode}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="ai-section">
            <h4>Code Analysis</h4>
            
            {analysisResults ? (
              <>
                {/* Quality Score */}
                <div className="analysis-summary">
                  <div className="quality-score">
                    <span className="score-label">Quality Score</span>
                    <div className="quality-bar">
                      <div
                        className="quality-fill"
                        style={{
                          width: `${codeAnalyzer.calculateQualityScore(analysisResults)}%`,
                          backgroundColor:
                            codeAnalyzer.calculateQualityScore(analysisResults) >= 75
                              ? '#10b981'
                              : codeAnalyzer.calculateQualityScore(analysisResults) >= 50
                              ? '#f59e0b'
                              : '#ef4444'
                        }}
                      />
                    </div>
                    <span className="score-value">
                      {Math.round(codeAnalyzer.calculateQualityScore(analysisResults))}%
                    </span>
                  </div>

                  <div className="analysis-stats">
                    <div className="stat">
                      <span className="stat-value errors">{analysisResults.errors.length}</span>
                      <span className="stat-label">Errors</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value warnings">{analysisResults.warnings.length}</span>
                      <span className="stat-label">Warnings</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value suggestions">{analysisResults.suggestions.length}</span>
                      <span className="stat-label">Tips</span>
                    </div>
                  </div>
                </div>

                {/* Issues List */}
                {analysisResults.errors.length > 0 && (
                  <div className="issues-group">
                    <h5 className="issue-type-title errors-title">🚨 Errors</h5>
                    {analysisResults.errors.map((error, idx) => (
                      <div key={idx} className="issue-item error">
                        <div className="issue-line">Line {error.line}</div>
                        <div className="issue-message">{error.message}</div>
                        {error.fix && <div className="issue-fix">💡 {error.fix}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {analysisResults.warnings.length > 0 && (
                  <div className="issues-group">
                    <h5 className="issue-type-title warnings-title">⚠️ Warnings</h5>
                    {analysisResults.warnings.map((warning, idx) => (
                      <div key={idx} className="issue-item warning">
                        <div className="issue-line">Line {warning.line}</div>
                        <div className="issue-message">{warning.message}</div>
                        {warning.fix && <div className="issue-fix">💡 {warning.fix}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {analysisResults.suggestions.length > 0 && (
                  <div className="issues-group">
                    <h5 className="issue-type-title suggestions-title">💡 Suggestions</h5>
                    {analysisResults.suggestions.slice(0, 5).map((suggestion, idx) => (
                      <div key={idx} className="issue-item suggestion">
                        <div className="issue-line">Line {suggestion.line}</div>
                        <div className="issue-message">{suggestion.message}</div>
                        {suggestion.fix && <div className="issue-fix">💡 {suggestion.fix}</div>}
                      </div>
                    ))}
                    {analysisResults.suggestions.length > 5 && (
                      <div className="more-items">+{analysisResults.suggestions.length - 5} more</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="ai-empty">Open a file to analyze</p>
            )}
          </div>
        )}

        {/* Code Completion Tab */}
        {activeTab === 'complete' && (
          <div className="ai-section">
            <h4>Smart Completions</h4>
            <p className="ai-help-text">Get intelligent code suggestions based on context</p>
            
            <button
              className="ai-action-btn complete-btn"
              onClick={handleGetCompletions}
            >
              ⌨ Get Suggestions
            </button>

            {completions.length > 0 && (
              <div className="completions-list">
                {completions.map((completion, idx) => (
                  <div key={idx} className="completion-item">
                    <span className="completion-icon">{completion.icon}</span>
                    <div className="completion-info">
                      <div className="completion-label">{completion.label}</div>
                      <div className="completion-detail">{completion.detail}</div>
                    </div>
                    <span className="completion-kind">{completion.kind}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="ai-section chat-section">
            <div className="chat-header">
              <h4>AI Chat Assistant</h4>
              <div className="chat-modes">
                {['coder', 'debugger', 'teacher', 'reviewer'].map(mode => (
                  <button
                    key={mode}
                    className={`chat-mode-btn ${chatMode === mode ? 'active' : ''}`}
                    onClick={() => handleChangeChatMode(mode)}
                    title={`${mode} mode`}
                  >
                    {mode === 'coder' && '👨‍💻'}
                    {mode === 'debugger' && '🐛'}
                    {mode === 'teacher' && '👨‍🏫'}
                    {mode === 'reviewer' && '👀'}
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="chat-messages">
              {chatMessages.length === 0 ? (
                <p className="ai-empty">Start a conversation about your code. Ask questions, get explanations, or request improvements!</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role}`}>
                    <div className="message-role">
                      {msg.role === 'user' ? '👤 You' : '🤖 Assistant'}
                    </div>
                    <div className="message-content">{msg.content}</div>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="message-suggestions">
                        <strong>Suggestions:</strong>
                        {msg.suggestions.map((sug, sidx) => (
                          <div key={sidx} className="suggestion-item">✓ {sug}</div>
                        ))}
                      </div>
                    )}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="message-actions">
                        <strong>Available Actions:</strong>
                        {msg.actions.map((action, aidx) => (
                          <div key={aidx} className="action-item">{action}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Chat Input */}
            <div className="chat-input-area">
              <textarea
                className="ai-input chat-input"
                placeholder={`Ask me anything about your code (${chatMode} mode)...`}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                rows={2}
              />
              <button
                className="ai-action-btn chat-send-btn"
                onClick={handleSendChat}
                disabled={chatLoading}
              >
                {chatLoading ? '⏳ Thinking...' : '📤 Send'}
              </button>
            </div>
          </div>
        )}

        {/* Agent Tab */}
        {activeTab === 'agent' && (
          <div className="ai-section agent-section">
            <h4>🤖 AI Action Agent</h4>
            <p className="ai-help-text">Automatically fix issues, refactor code, and apply improvements</p>

            {/* Available Actions */}
            {availableActions.length === 0 ? (
              <p className="ai-empty">Open a file to see available actions</p>
            ) : (
              <div className="actions-container">
                <h5>Available Actions</h5>
                <div className="actions-list">
                  {availableActions.map((action, idx) => (
                    <div key={idx} className={`action-card ${action.severity}`}>
                      <div className="action-header">
                        <span className="action-icon">{getActionIcon(action)}</span>
                        <span className="action-label">{action.label}</span>
                        <span className={`action-severity ${action.severity}`}>
                          {action.severity}
                        </span>
                      </div>
                      <p className="action-description">{action.description}</p>
                      <button
                        className="action-execute-btn"
                        onClick={() => handleExecuteAction(action)}
                        disabled={!action.executable}
                      >
                        {action.executable ? '⚡ Execute' : '💭 Review'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Executed Actions History */}
            {executedActions.length > 0 && (
              <div className="executed-actions">
                <h5>Executed Actions</h5>
                <div className="actions-history">
                  {executedActions.slice(-5).map((action, idx) => (
                    <div key={idx} className="action-history-item success">
                      <span className="history-icon">✅</span>
                      <div className="history-info">
                        <div className="history-action">{action.label}</div>
                        <div className="history-time">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="ai-panel-footer">
        <p className="ai-tip">💡 Tip: AI features work best with your current file open</p>
      </div>
    </div>
  );
};

export default AIPanel;
