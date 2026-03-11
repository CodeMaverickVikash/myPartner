/**
 * useAIAssistant - React hook for using AI features in components
 * Provides easy access to code analysis, generation, and completions
 */

import { useState, useCallback, useRef } from 'react';
import aiContextManager from '../utils/AIContextManager';
import codeAnalyzer from '../utils/CodeAnalyzer';
import aiAgent from '../utils/AIAgent';
import codeCompleter from '../utils/CodeCompleter';

export const useAIAssistant = (filePath, editorContent) => {
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Analyze the current code
   */
  const analyzeCode = useCallback(() => {
    if (!filePath || !editorContent) {
      setError('No file or content to analyze');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Analyze context
      const context = aiContextManager.analyzeFileContext(filePath, editorContent);

      // Analyze code quality
      const analysis = codeAnalyzer.analyzeCode(filePath, editorContent);
      setAnalysis(analysis);

      // Get refactoring suggestions
      const refactoringSuggestions = aiAgent.suggestRefactoring(filePath, editorContent);
      setSuggestions(refactoringSuggestions);

      setLoading(false);
      return analysis;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [filePath, editorContent]);

  /**
   * Generate code from description
   */
  const generateCode = useCallback(
    async (description) => {
      if (!description.trim()) {
        setError('Please describe what code you want to generate');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        const context = aiContextManager.getLineContext(filePath || '', 1);
        const result = aiAgent.generateCode(description, 'javascript', context);

        setLoading(false);
        return result;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        return null;
      }
    },
    [filePath]
  );

  /**
   * Get code completions
   */
  const getCompletions = useCallback(
    (lineNumber = 1, column = 0) => {
      if (!filePath || !editorContent) {
        setError('No file or content for completions');
        return [];
      }

      try {
        setError(null);
        const comps = codeCompleter.getCompletions(filePath, editorContent, lineNumber, column);
        setCompletions(comps);
        return comps;
      } catch (err) {
        setError(err.message);
        return [];
      }
    },
    [filePath, editorContent]
  );

  /**
   * Get specific issue type from analysis
   */
  const getIssues = useCallback(
    (severity = 'all') => {
      if (!analysis) return [];
      if (severity === 'all') {
        return [
          ...analysis.errors,
          ...analysis.warnings,
          ...analysis.suggestions
        ];
      }
      const severityKey = severity.toLowerCase() + 's';
      return analysis[severityKey] || [];
    },
    [analysis]
  );

  /**
   * Get quality score for the file
   */
  const getQualityScore = useCallback(() => {
    if (!analysis) return null;
    return codeAnalyzer.calculateQualityScore(analysis);
  }, [analysis]);

  /**
   * Find references to a symbol
   */
  const findReferences = useCallback((symbol) => {
    return aiContextManager.findReferences(symbol);
  }, []);

  /**
   * Get file symbols (functions, classes, variables)
   */
  const getFileSymbols = useCallback(() => {
    if (!filePath) return [];
    return aiContextManager.getFileSymbols(filePath);
  }, [filePath]);

  /**
   * Clear cache for the file
   */
  const clearCache = useCallback(() => {
    if (filePath) {
      aiContextManager.invalidateFile(filePath);
      codeAnalyzer.clearAnalysis(filePath);
      codeCompleter.clearFileCache(filePath);
    }
  }, [filePath]);

  /**
   * Get all AI statistics
   */
  const getStatistics = useCallback(() => {
    return {
      analysis: analysis ? {
        totalIssues: analysis.errors.length + analysis.warnings.length + analysis.suggestions.length,
        errorCount: analysis.errors.length,
        warningCount: analysis.warnings.length,
        suggestionCount: analysis.suggestions.length,
        quality: getQualityScore()
      } : null,
      completions: completions ? {
        totalCompletions: completions.length,
        suggestions: codeCompleter.getStatistics(filePath)
      } : null,
      refactoring: {
        suggestionsCount: suggestions.length
      }
    };
  }, [analysis, completions, suggestions, filePath, getQualityScore]);

  return {
    // State
    analysis,
    suggestions,
    completions,
    loading,
    error,

    // Methods
    analyzeCode,
    generateCode,
    getCompletions,
    getIssues,
    getQualityScore,
    findReferences,
    getFileSymbols,
    clearCache,
    getStatistics,

    // Helpers
    hasErrors: analysis ? analysis.errors.length > 0 : false,
    hasWarnings: analysis ? analysis.warnings.length > 0 : false,
    hasSuggestions: suggestions.length > 0
  };
};

/**
 * useCodeCompletion - Specialized hook for code completion
 */
export const useCodeCompletion = (filePath, editorContent) => {
  const [completions, setCompletions] = useState([]);
  const [recentCompletions, setRecentCompletions] = useState([]);

  const getCompletions = useCallback(
    (lineNumber, column) => {
      const comps = codeCompleter.getCompletions(
        filePath,
        editorContent,
        lineNumber,
        column
      );
      setCompletions(comps);
      return comps;
    },
    [filePath, editorContent]
  );

  const selectCompletion = useCallback(
    (completion) => {
      setRecentCompletions(prev => [
        { ...completion, timestamp: Date.now() },
        ...prev.slice(0, 9)
      ]);
    },
    []
  );

  return {
    completions,
    recentCompletions,
    getCompletions,
    selectCompletion
  };
};

/**
 * useCodeAnalysis - Specialized hook for code analysis
 */
export const useCodeAnalysis = (filePath, editorContent) => {
  const [analysis, setAnalysis] = useState(null);
  const [quality, setQuality] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(() => {
    try {
      setLoading(true);
      const result = codeAnalyzer.analyzeCode(filePath, editorContent);
      setAnalysis(result);
      
      const score = codeAnalyzer.calculateQualityScore(result);
      setQuality({
        score,
        rating: score >= 75 ? 'Good' : score >= 50 ? 'Fair' : 'Poor'
      });
      setLoading(false);
    } catch (err) {
      console.error('Analysis error:', err);
      setLoading(false);
    }
  }, [filePath, editorContent]);

  return {
    analysis,
    quality,
    loading,
    analyze,
    errors: analysis?.errors || [],
    warnings: analysis?.warnings || [],
    suggestions: analysis?.suggestions || []
  };
};

/**
 * useCodeGeneration - Specialized hook for code generation
 */
export const useCodeGeneration = () => {
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = useCallback(async (description, context = {}) => {
    if (!description.trim()) {
      setError('Please provide a description');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = aiAgent.generateCode(description, 'javascript', context);
      setGeneratedCode(result.code);
      
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    setGeneratedCode('');
    setError(null);
  }, []);

  return {
    generatedCode,
    loading,
    error,
    generate,
    clear
  };
};

export default useAIAssistant;
