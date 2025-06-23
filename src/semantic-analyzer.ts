import * as vscode from 'vscode';
import { ParsedFile, ASTFunction, ASTClass } from './ast-parser';

export interface SemanticAnalysis {
  codePatterns: CodePattern[];
  architecturalIssues: ArchitecturalIssue[];
  performanceIssues: PerformanceIssue[];
  securityIssues: SecurityIssue[];
  maintainabilityScore: number;
  complexityScore: number;
  testabilityScore: number;
  recommendations: Recommendation[];
}

export interface CodePattern {
  type: 'design_pattern' | 'anti_pattern' | 'code_smell' | 'best_practice';
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  confidence: number;
  suggestion?: string;
}

export interface ArchitecturalIssue {
  type: 'coupling' | 'cohesion' | 'separation_of_concerns' | 'dependency_inversion';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedComponents: string[];
  suggestion: string;
}

export interface PerformanceIssue {
  type: 'memory_leak' | 'inefficient_algorithm' | 'unnecessary_computation' | 'blocking_operation';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  impact: string;
  suggestion: string;
}

export interface SecurityIssue {
  type: 'injection' | 'xss' | 'authentication' | 'authorization' | 'data_exposure';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  vulnerability: string;
  suggestion: string;
}

export interface Recommendation {
  type: 'refactor' | 'optimize' | 'secure' | 'test' | 'document';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  code?: string;
}

export class SemanticAnalyzer {
  private patterns: Map<string, RegExp[]> = new Map();
  private antiPatterns: Map<string, RegExp[]> = new Map();
  private securityPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns() {
    // Design Patterns
    this.patterns.set('singleton', [
      /private\s+static\s+\w+\s+instance/,
      /getInstance\s*\(\s*\)\s*{/
    ]);

    this.patterns.set('factory', [
      /create\w+\s*\(\s*\)\s*{/,
      /factory\s*\(\s*\)\s*{/
    ]);

    this.patterns.set('observer', [
      /addEventListener/,
      /on\w+\s*=/,
      /subscribe\s*\(/
    ]);

    // Anti-patterns
    this.antiPatterns.set('god_object', [
      /class\s+\w+\s*{[^}]{1000,}/,
      /function\s+\w+\s*\([^)]*\)\s*{[^}]{500,}/
    ]);

    this.antiPatterns.set('magic_numbers', [
      /\b\d{3,}\b(?!\s*[;,)])/,
      /\b\d+\b(?!\s*[;,)])/
    ]);

    this.antiPatterns.set('deep_nesting', [
      /if\s*\([^)]*\)\s*{[^}]*if\s*\([^)]*\)\s*{[^}]*if\s*\([^)]*\)\s*{/
    ]);

    // Security Patterns
    this.securityPatterns.set('sql_injection', [
      /query\s*\(\s*[^)]*\+/,
      /execute\s*\(\s*[^)]*\+/
    ]);

    this.securityPatterns.set('xss', [
      /innerHTML\s*=/,
      /document\.write\s*\(/,
      /eval\s*\(/
    ]);

    this.securityPatterns.set('hardcoded_credentials', [
      /password\s*=\s*['"`][^'"`]+['"`]/,
      /api_key\s*=\s*['"`][^'"`]+['"`]/,
      /secret\s*=\s*['"`][^'"`]+['"`]/
    ]);
  }

  analyzeFile(parsedFile: ParsedFile, content: string): SemanticAnalysis {
    const codePatterns = this.detectCodePatterns(parsedFile, content);
    const architecturalIssues = this.analyzeArchitecture(parsedFile);
    const performanceIssues = this.detectPerformanceIssues(parsedFile, content);
    const securityIssues = this.detectSecurityIssues(content);
    const recommendations = this.generateRecommendations(parsedFile, codePatterns, architecturalIssues, performanceIssues, securityIssues);

    return {
      codePatterns,
      architecturalIssues,
      performanceIssues,
      securityIssues,
      maintainabilityScore: this.calculateMaintainabilityScore(parsedFile, codePatterns),
      complexityScore: this.calculateComplexityScore(parsedFile),
      testabilityScore: this.calculateTestabilityScore(parsedFile),
      recommendations
    };
  }

  private detectCodePatterns(parsedFile: ParsedFile, content: string): CodePattern[] {
    const patterns: CodePattern[] = [];

    // Check for design patterns
    for (const [patternName, regexes] of this.patterns) {
      for (const regex of regexes) {
        const matches = content.match(regex);
        if (matches) {
          patterns.push({
            type: 'design_pattern',
            name: patternName,
            description: `Detected ${patternName} pattern`,
            severity: 'low',
            confidence: 0.8,
            suggestion: `Consider if this ${patternName} pattern is appropriate for your use case`
          });
        }
      }
    }

    // Check for anti-patterns
    for (const [antiPatternName, regexes] of this.antiPatterns) {
      for (const regex of regexes) {
        const matches = content.match(regex);
        if (matches) {
          patterns.push({
            type: 'anti_pattern',
            name: antiPatternName,
            description: `Detected ${antiPatternName} anti-pattern`,
            severity: 'high',
            confidence: 0.7,
            suggestion: this.getAntiPatternSuggestion(antiPatternName)
          });
        }
      }
    }

    // Check for code smells
    const codeSmells = this.detectCodeSmells(parsedFile);
    patterns.push(...codeSmells);

    return patterns;
  }

  private detectCodeSmells(parsedFile: ParsedFile): CodePattern[] {
    const smells: CodePattern[] = [];

    // Long functions
    parsedFile.functions.forEach(func => {
      if (func.complexity > 10) {
        smells.push({
          type: 'code_smell',
          name: 'long_function',
          description: `Function '${func.name}' is too complex (complexity: ${func.complexity})`,
          severity: 'medium',
          line: func.line,
          confidence: 0.9,
          suggestion: 'Consider breaking this function into smaller, more focused functions'
        });
      }
    });

    // Large classes
    parsedFile.classes.forEach(cls => {
      if (cls.methods.length > 10) {
        smells.push({
          type: 'code_smell',
          name: 'large_class',
          description: `Class '${cls.name}' has too many methods (${cls.methods.length})`,
          severity: 'medium',
          line: cls.line,
          confidence: 0.8,
          suggestion: 'Consider splitting this class into smaller, more focused classes'
        });
      }
    });

    return smells;
  }

  private analyzeArchitecture(parsedFile: ParsedFile): ArchitecturalIssue[] {
    const issues: ArchitecturalIssue[] = [];

    // High coupling detection
    const highCouplingFunctions = parsedFile.functions.filter(f => f.calls.length > 10);
    if (highCouplingFunctions.length > 0) {
      issues.push({
        type: 'coupling',
        description: `${highCouplingFunctions.length} functions have high coupling (many dependencies)`,
        severity: 'medium',
        affectedComponents: highCouplingFunctions.map(f => f.name),
        suggestion: 'Consider reducing dependencies and applying dependency inversion principle'
      });
    }

    // Low cohesion detection
    const largeClasses = parsedFile.classes.filter(c => c.methods.length > 8);
    if (largeClasses.length > 0) {
      issues.push({
        type: 'cohesion',
        description: `${largeClasses.length} classes have low cohesion (too many responsibilities)`,
        severity: 'medium',
        affectedComponents: largeClasses.map(c => c.name),
        suggestion: 'Split classes into smaller, more focused components with single responsibilities'
      });
    }

    return issues;
  }

  private detectPerformanceIssues(parsedFile: ParsedFile, content: string): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];

    // Memory leak patterns
    const memoryLeakPatterns = [
      /setInterval\s*\([^)]*\)/g,
      /setTimeout\s*\([^)]*\)/g,
      /addEventListener\s*\([^)]*\)/g
    ];

    memoryLeakPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'memory_leak',
          description: 'Potential memory leak: event listeners or timers not properly cleaned up',
          severity: 'medium',
          impact: 'Memory usage may grow over time',
          suggestion: 'Ensure proper cleanup of event listeners and timers'
        });
      }
    });

    // Inefficient algorithms
    parsedFile.functions.forEach(func => {
      if (func.complexity > 15) {
        issues.push({
          type: 'inefficient_algorithm',
          description: `Function '${func.name}' has high complexity (${func.complexity})`,
          severity: 'medium',
          line: func.line,
          impact: 'May cause performance issues with large inputs',
          suggestion: 'Consider optimizing the algorithm or breaking it into smaller functions'
        });
      }
    });

    return issues;
  }

  private detectSecurityIssues(content: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // SQL Injection
    const sqlPatterns = this.securityPatterns.get('sql_injection') || [];
    sqlPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'injection',
          description: 'Potential SQL injection vulnerability',
          severity: 'critical',
          vulnerability: 'User input directly concatenated into SQL query',
          suggestion: 'Use parameterized queries or prepared statements'
        });
      }
    });

    // XSS
    const xssPatterns = this.securityPatterns.get('xss') || [];
    xssPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'xss',
          description: 'Potential XSS vulnerability',
          severity: 'high',
          vulnerability: 'Unsanitized user input rendered to DOM',
          suggestion: 'Sanitize user input and use safe DOM manipulation methods'
        });
      }
    });

    // Hardcoded credentials
    const credentialPatterns = this.securityPatterns.get('hardcoded_credentials') || [];
    credentialPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'data_exposure',
          description: 'Hardcoded credentials detected',
          severity: 'high',
          vulnerability: 'Sensitive data exposed in source code',
          suggestion: 'Use environment variables or secure configuration management'
        });
      }
    });

    return issues;
  }

  private generateRecommendations(
    parsedFile: ParsedFile,
    patterns: CodePattern[],
    architecturalIssues: ArchitecturalIssue[],
    performanceIssues: PerformanceIssue[],
    securityIssues: SecurityIssue[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Refactoring recommendations
    if (patterns.some(p => p.type === 'anti_pattern')) {
      recommendations.push({
        type: 'refactor',
        title: 'Refactor Anti-patterns',
        description: 'Address detected anti-patterns to improve code quality',
        priority: 'high',
        effort: 'medium',
        impact: 'high'
      });
    }

    // Performance optimization
    if (performanceIssues.length > 0) {
      recommendations.push({
        type: 'optimize',
        title: 'Optimize Performance',
        description: 'Address performance issues to improve application speed',
        priority: 'medium',
        effort: 'medium',
        impact: 'medium'
      });
    }

    // Security fixes
    if (securityIssues.length > 0) {
      recommendations.push({
        type: 'secure',
        title: 'Fix Security Issues',
        description: 'Address security vulnerabilities to protect the application',
        priority: 'critical',
        effort: 'high',
        impact: 'high'
      });
    }

    // Testing recommendations
    if (parsedFile.functions.length > 0) {
      recommendations.push({
        type: 'test',
        title: 'Add Unit Tests',
        description: 'Add comprehensive unit tests for better code reliability',
        priority: 'medium',
        effort: 'high',
        impact: 'high'
      });
    }

    return recommendations;
  }

  private calculateMaintainabilityScore(parsedFile: ParsedFile, patterns: CodePattern[]): number {
    let score = 100;

    // Reduce score based on anti-patterns
    const antiPatterns = patterns.filter(p => p.type === 'anti_pattern');
    score -= antiPatterns.length * 10;

    // Reduce score based on code smells
    const codeSmells = patterns.filter(p => p.type === 'code_smell');
    score -= codeSmells.length * 5;

    // Reduce score based on complexity
    if (parsedFile.complexity > 50) {
      score -= 20;
    }

    // Reduce score based on large classes
    const largeClasses = parsedFile.classes.filter(c => c.methods.length > 10);
    score -= largeClasses.length * 5;

    return Math.max(0, score);
  }

  private calculateComplexityScore(parsedFile: ParsedFile): number {
    const totalComplexity = parsedFile.complexity;
    const totalFunctions = parsedFile.functions.length;
    
    if (totalFunctions === 0) return 0;
    
    const averageComplexity = totalComplexity / totalFunctions;
    
    if (averageComplexity < 3) return 100;
    if (averageComplexity < 5) return 80;
    if (averageComplexity < 8) return 60;
    if (averageComplexity < 12) return 40;
    return 20;
  }

  private calculateTestabilityScore(parsedFile: ParsedFile): number {
    let score = 100;

    // Reduce score for high coupling
    const highCouplingFunctions = parsedFile.functions.filter(f => f.calls.length > 8);
    score -= highCouplingFunctions.length * 5;

    // Reduce score for large functions
    const largeFunctions = parsedFile.functions.filter(f => f.complexity > 10);
    score -= largeFunctions.length * 3;

    return Math.max(0, score);
  }

  private getAntiPatternSuggestion(antiPatternName: string): string {
    const suggestions: Record<string, string> = {
      'god_object': 'Break down the large class into smaller, focused classes',
      'magic_numbers': 'Replace magic numbers with named constants or enums',
      'deep_nesting': 'Extract nested conditions into separate functions or use early returns'
    };

    return suggestions[antiPatternName] || 'Consider refactoring to improve code quality';
  }
} 