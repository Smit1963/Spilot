import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { ContextManager } from './context-manager';
import { ErrorAnalyzer } from './error-analyzer';
import { ASTParser, ParsedFile } from './ast-parser';
import { SemanticAnalyzer, SemanticAnalysis } from './semantic-analyzer';
import { CodeGenerator, CodeGenerationRequest, GeneratedCode } from './code-generator';
import { RefactoringEngine, RefactoringSuggestion } from './refactoring-engine';

export interface AIResponse {
  content: string;
  codeBlocks: CodeBlock[];
  confidence: number;
  explanation?: string;
  suggestions?: string[];
  refactoringSuggestions?: RefactoringSuggestion[];
  generatedCode?: GeneratedCode;
}

export interface CodeBlock {
  language: string;
  content: string;
  description?: string;
}

export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentFile?: string;
  currentSelection?: string;
  contextFiles: string[];
}

export class AICodingAgent {
  private apiKey: string;
  private contextManager: ContextManager;
  private errorAnalyzer: ErrorAnalyzer;
  private astParser: ASTParser;
  private semanticAnalyzer: SemanticAnalyzer;
  private codeGenerator: CodeGenerator;
  private refactoringEngine: RefactoringEngine;
  private conversationContext: ConversationContext;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.1-8b-instant') {
    this.apiKey = apiKey;
    this.model = model;
    this.contextManager = new ContextManager();
    this.errorAnalyzer = new ErrorAnalyzer(this.contextManager.getContext());
    this.astParser = new ASTParser();
    this.semanticAnalyzer = new SemanticAnalyzer();
    this.codeGenerator = new CodeGenerator();
    this.refactoringEngine = new RefactoringEngine();
    this.conversationContext = {
      messages: [],
      contextFiles: []
    };
  }

  async initialize(): Promise<void> {
    await this.contextManager.initialize();
    console.log('✅ AI Coding Agent initialized successfully');
  }

  async processUserQuery(query: string, editor?: vscode.TextEditor): Promise<AIResponse> {
    try {
      // Update conversation context
      this.updateConversationContext(query, editor);

      // Get comprehensive context
      const context = await this.buildComprehensiveContext(editor);

      // Analyze the query type and determine appropriate response
      const queryType = this.analyzeQueryType(query);
      
      let response: AIResponse;

      switch (queryType) {
        case 'code_generation':
          response = await this.handleCodeGeneration(query, context);
          break;
        case 'refactoring':
          response = await this.handleRefactoring(query, context);
          break;
        case 'analysis':
          response = await this.handleAnalysis(query, context);
          break;
        case 'error_fix':
          response = await this.handleErrorFix(query, context);
          break;
        case 'explanation':
          response = await this.handleExplanation(query, context);
          break;
        default:
          response = await this.handleGeneralQuery(query, context);
      }

      // Update conversation context with response
      this.conversationContext.messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: new Date()
      });

      return response;

    } catch (error: any) {
      console.error('Error processing user query:', error);
      return {
        content: `I encountered an error while processing your request: ${error.message}`,
        codeBlocks: [],
        confidence: 0,
        explanation: 'An error occurred during processing'
      };
    }
  }

  private async buildComprehensiveContext(editor?: vscode.TextEditor): Promise<string> {
    let context = '';

    // Get current file context
    if (editor) {
      const document = editor.document;
      const filePath = document.fileName;
      const content = document.getText();
      const selection = editor.selection;
      
      context += `\n\nCurrent File: ${path.basename(filePath)}\n`;
      context += `Language: ${document.languageId}\n`;
      
      if (!selection.isEmpty) {
        const selectedText = document.getText(selection);
        context += `\nSelected Code:\n\`\`\`${document.languageId}\n${selectedText}\n\`\`\`\n`;
      }

      // Parse AST for deeper understanding
      try {
        const parsedFile = await this.astParser.parseFile(filePath, content);
        context += `\nFile Structure:\n`;
        context += `- Functions: ${parsedFile.functions.length}\n`;
        context += `- Classes: ${parsedFile.classes.length}\n`;
        context += `- Imports: ${parsedFile.imports.length}\n`;
        context += `- Complexity: ${parsedFile.complexity}\n`;
      } catch (error) {
        console.warn('Failed to parse AST:', error);
      }
    }

    // Get workspace context
    const workspaceContext = await this.contextManager.getWorkspaceContext();
    context += `\n\nWorkspace Context:\n${workspaceContext}\n`;

    // Get recent files context
    const recentFiles = await this.contextManager.getRecentFiles(5);
    if (recentFiles.length > 0) {
      context += `\n\nRecent Files:\n${recentFiles.map(f => `- ${f}`).join('\n')}\n`;
    }

    // Get conversation history
    if (this.conversationContext.messages.length > 0) {
      context += `\n\nRecent Conversation:\n`;
      const recentMessages = this.conversationContext.messages.slice(-3);
      recentMessages.forEach(msg => {
        context += `${msg.role}: ${msg.content.substring(0, 100)}...\n`;
      });
    }

    return context;
  }

  private analyzeQueryType(query: string): 'code_generation' | 'refactoring' | 'analysis' | 'error_fix' | 'explanation' | 'general' {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('generate') || lowerQuery.includes('create') || lowerQuery.includes('write')) {
      return 'code_generation';
    }
    
    if (lowerQuery.includes('refactor') || lowerQuery.includes('improve') || lowerQuery.includes('optimize')) {
      return 'refactoring';
    }
    
    if (lowerQuery.includes('analyze') || lowerQuery.includes('review') || lowerQuery.includes('check')) {
      return 'analysis';
    }
    
    if (lowerQuery.includes('error') || lowerQuery.includes('fix') || lowerQuery.includes('bug')) {
      return 'error_fix';
    }
    
    if (lowerQuery.includes('explain') || lowerQuery.includes('what') || lowerQuery.includes('how')) {
      return 'explanation';
    }
    
    return 'general';
  }

  private async handleCodeGeneration(query: string, context: string): Promise<AIResponse> {
    // Extract generation requirements from query
    const generationRequest = this.extractGenerationRequest(query);
    
    // Generate code using the code generator
    const generatedCode = this.codeGenerator.generateCode(generationRequest);
    
    // Get AI response with context
    const prompt = this.buildCodeGenerationPrompt(query, context, generatedCode);
    const aiResponse = await this.getAIResponse(prompt);
    
    return {
      content: aiResponse,
      codeBlocks: [{
        language: generatedCode.language,
        content: generatedCode.code,
        description: generationRequest.description
      }],
      confidence: 0.9,
      explanation: 'Generated code based on your requirements',
      generatedCode
    };
  }

  private async handleRefactoring(query: string, context: string): Promise<AIResponse> {
    // Get current file for refactoring analysis
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return {
        content: 'No active editor found for refactoring analysis',
        codeBlocks: [],
        confidence: 0
      };
    }

    const document = editor.document;
    const content = document.getText();
    const filePath = document.fileName;

    // Parse file and analyze for refactoring opportunities
    const parsedFile = await this.astParser.parseFile(filePath, content);
    const semanticAnalysis = this.semanticAnalyzer.analyzeFile(parsedFile, content);
    const refactoringSuggestions = this.refactoringEngine.analyzeForRefactoring(parsedFile, semanticAnalysis);

    // Get AI response with refactoring suggestions
    const prompt = this.buildRefactoringPrompt(query, context, refactoringSuggestions);
    const aiResponse = await this.getAIResponse(prompt);

    return {
      content: aiResponse,
      codeBlocks: [],
      confidence: 0.8,
      explanation: 'Analyzed code for refactoring opportunities',
      refactoringSuggestions
    };
  }

  private async handleAnalysis(query: string, context: string): Promise<AIResponse> {
    // Get current file for analysis
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return {
        content: 'No active editor found for analysis',
        codeBlocks: [],
        confidence: 0
      };
    }

    const document = editor.document;
    const content = document.getText();
    const filePath = document.fileName;

    // Perform comprehensive analysis
    const parsedFile = await this.astParser.parseFile(filePath, content);
    const semanticAnalysis = this.semanticAnalyzer.analyzeFile(parsedFile, content);

    // Build analysis report
    const analysisReport = this.buildAnalysisReport(parsedFile, semanticAnalysis);

    // Get AI response with analysis
    const prompt = this.buildAnalysisPrompt(query, context, analysisReport);
    const aiResponse = await this.getAIResponse(prompt);

    return {
      content: aiResponse,
      codeBlocks: [],
      confidence: 0.9,
      explanation: 'Comprehensive code analysis completed',
      suggestions: this.extractSuggestions(semanticAnalysis)
    };
  }

  private async handleErrorFix(query: string, context: string): Promise<AIResponse> {
    // Extract error information from query
    const errorInfo = this.errorAnalyzer.parseError(query);
    
    // Get AI response for error fixing
    const prompt = this.buildErrorFixPrompt(query, context, errorInfo);
    const aiResponse = await this.getAIResponse(prompt);

    return {
      content: aiResponse,
      codeBlocks: this.extractCodeBlocks(aiResponse),
      confidence: 0.8,
      explanation: 'Error analysis and fix suggestions provided'
    };
  }

  private async handleExplanation(query: string, context: string): Promise<AIResponse> {
    // Get AI response for explanation
    const prompt = this.buildExplanationPrompt(query, context);
    const aiResponse = await this.getAIResponse(prompt);

    return {
      content: aiResponse,
      codeBlocks: this.extractCodeBlocks(aiResponse),
      confidence: 0.9,
      explanation: 'Code explanation provided'
    };
  }

  private async handleGeneralQuery(query: string, context: string): Promise<AIResponse> {
    // Get AI response for general query
    const prompt = this.buildGeneralPrompt(query, context);
    const aiResponse = await this.getAIResponse(prompt);

    return {
      content: aiResponse,
      codeBlocks: this.extractCodeBlocks(aiResponse),
      confidence: 0.7,
      explanation: 'General assistance provided'
    };
  }

  private extractGenerationRequest(query: string): CodeGenerationRequest {
    // Simple extraction - in a real implementation, this would be more sophisticated
    const lowerQuery = query.toLowerCase();
    
    let type: CodeGenerationRequest['type'] = 'function';
    if (lowerQuery.includes('class')) type = 'class';
    if (lowerQuery.includes('component')) type = 'component';
    if (lowerQuery.includes('test')) type = 'test';
    if (lowerQuery.includes('interface')) type = 'interface';
    if (lowerQuery.includes('utility')) type = 'utility';

    return {
      type,
      name: 'GeneratedCode',
      description: query,
      language: 'typescript',
      requirements: this.extractRequirements(query)
    };
  }

  private extractRequirements(query: string): string[] {
    const requirements: string[] = [];
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('async')) requirements.push('async');
    if (lowerQuery.includes('validate')) requirements.push('validation');
    if (lowerQuery.includes('react')) requirements.push('react');
    if (lowerQuery.includes('test')) requirements.push('testing');
    
    return requirements;
  }

  private buildAnalysisReport(parsedFile: ParsedFile, semanticAnalysis: SemanticAnalysis): string {
    return `
Code Analysis Report:

File Structure:
- Functions: ${parsedFile.functions.length}
- Classes: ${parsedFile.classes.length}
- Imports: ${parsedFile.imports.length}
- Dependencies: ${parsedFile.dependencies.length}

Quality Metrics:
- Maintainability Score: ${semanticAnalysis.maintainabilityScore}/100
- Complexity Score: ${semanticAnalysis.complexityScore}/100
- Testability Score: ${semanticAnalysis.testabilityScore}/100

Issues Found:
- Code Patterns: ${semanticAnalysis.codePatterns.length}
- Architectural Issues: ${semanticAnalysis.architecturalIssues.length}
- Performance Issues: ${semanticAnalysis.performanceIssues.length}
- Security Issues: ${semanticAnalysis.securityIssues.length}

Recommendations: ${semanticAnalysis.recommendations.length}
`;
  }

  private extractSuggestions(semanticAnalysis: SemanticAnalysis): string[] {
    return semanticAnalysis.recommendations.map(rec => 
      `${rec.title}: ${rec.description} (Priority: ${rec.priority}, Effort: ${rec.effort})`
    );
  }

  private extractCodeBlocks(response: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(response)) !== null) {
      codeBlocks.push({
        language: match[1] || 'plaintext',
        content: match[2].trim()
      });
    }

    return codeBlocks;
  }

  private updateConversationContext(query: string, editor?: vscode.TextEditor): void {
    this.conversationContext.messages.push({
      role: 'user',
      content: query,
      timestamp: new Date()
    });

    if (editor) {
      this.conversationContext.currentFile = editor.document.fileName;
      if (!editor.selection.isEmpty) {
        this.conversationContext.currentSelection = editor.document.getText(editor.selection);
      }
    }
  }

  // Prompt building methods
  private buildCodeGenerationPrompt(query: string, context: string, generatedCode: GeneratedCode): string {
    return `You are an expert AI coding assistant. Generate code based on the user's request.

User Request: ${query}

Context: ${context}

Generated Code:
\`\`\`${generatedCode.language}
${generatedCode.code}
\`\`\`

Please provide a helpful response explaining the generated code and any additional suggestions.`;
  }

  private buildRefactoringPrompt(query: string, context: string, suggestions: RefactoringSuggestion[]): string {
    return `You are an expert AI coding assistant. Analyze the refactoring suggestions and provide guidance.

User Request: ${query}

Context: ${context}

Refactoring Suggestions: ${suggestions.length} found
${suggestions.map(s => `- ${s.title}: ${s.description} (Severity: ${s.severity})`).join('\n')}

Please provide a helpful response with refactoring recommendations and implementation guidance.`;
  }

  private buildAnalysisPrompt(query: string, context: string, analysisReport: string): string {
    return `You are an expert AI coding assistant. Provide code analysis and recommendations.

User Request: ${query}

Context: ${context}

Analysis Report: ${analysisReport}

Please provide a comprehensive analysis with actionable recommendations.`;
  }

  private buildErrorFixPrompt(query: string, context: string, errorInfo: any): string {
    return `You are an expert AI coding assistant. Help fix the error.

User Request: ${query}

Context: ${context}

Error Information: ${JSON.stringify(errorInfo, null, 2)}

Please provide a solution to fix this error.`;
  }

  private buildExplanationPrompt(query: string, context: string): string {
    return `You are an expert AI coding assistant. Explain the code.

User Request: ${query}

Context: ${context}

Please provide a clear and detailed explanation.`;
  }

  private buildGeneralPrompt(query: string, context: string): string {
    return `You are an expert AI coding assistant. Help with the user's request.

User Request: ${query}

Context: ${context}

Please provide helpful assistance.`;
  }

  private async getAIResponse(prompt: string): Promise<string> {
    try {
      // Create AbortController with optimized timeout based on model
      const controller = new AbortController();
      const timeout = this.getTimeoutForModel(this.model);
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout reached (${timeout}ms), aborting...`);
        controller.abort();
      }, timeout);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert AI coding assistant with deep knowledge of software development, best practices, and multiple programming languages. Provide helpful, accurate, and actionable responses.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false // Disable streaming for better performance
        }),
        signal: controller.signal
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error?.message || `HTTP ${response.status}`}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out. Please try again or switch to a faster model like Llama 3.1 8B Instant.`);
      }
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  private getTimeoutForModel(model: string): number {
    // Set different timeouts based on model size and expected performance
    switch (model) {
      case 'llama-3.1-8b-instant':
        return 15000; // 15 seconds for fast model
      case 'meta-llama/llama-4-maverick-17b-128e-instruct':
        return 25000; // 25 seconds for medium model
      case 'deepseek-r1-distill-llama-70b':
        return 35000; // 35 seconds for large model
      default:
        return 25000; // Default 25 seconds
    }
  }

  // Public methods for external use
  async generateCode(request: CodeGenerationRequest): Promise<GeneratedCode> {
    return this.codeGenerator.generateCode(request);
  }

  async analyzeFile(filePath: string, content: string): Promise<SemanticAnalysis> {
    const parsedFile = await this.astParser.parseFile(filePath, content);
    return this.semanticAnalyzer.analyzeFile(parsedFile, content);
  }

  async getRefactoringSuggestions(filePath: string, content: string): Promise<RefactoringSuggestion[]> {
    const parsedFile = await this.astParser.parseFile(filePath, content);
    const semanticAnalysis = this.semanticAnalyzer.analyzeFile(parsedFile, content);
    return this.refactoringEngine.analyzeForRefactoring(parsedFile, semanticAnalysis);
  }

  getConversationHistory(): ConversationContext {
    return { ...this.conversationContext };
  }

  clearConversationHistory(): void {
    this.conversationContext = {
      messages: [],
      contextFiles: []
    };
  }

  setModel(model: string): void {
    this.model = model;
  }
} 