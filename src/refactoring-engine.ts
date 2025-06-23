import * as vscode from 'vscode';
import { ParsedFile, ASTFunction, ASTClass } from './ast-parser';
import { SemanticAnalysis } from './semantic-analyzer';

interface RefactoringRule {
  name: string;
  description: string;
  condition: (item: ASTFunction | ASTClass) => boolean;
  apply: (item: ASTFunction | ASTClass, content: string) => RefactoringSuggestion;
}

export interface RefactoringSuggestion {
  id: string;
  type: 'extract_method' | 'extract_class' | 'rename' | 'simplify' | 'optimize' | 'security';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  line?: number;
  confidence: number;
  codeChanges: CodeChange[];
  before: string;
  after: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface CodeChange {
  type: 'insert' | 'delete' | 'replace' | 'move';
  line: number;
  column: number;
  oldText?: string;
  newText: string;
  description: string;
}

export interface RefactoringResult {
  success: boolean;
  changes: CodeChange[];
  suggestions: RefactoringSuggestion[];
  errors: string[];
  warnings: string[];
}

export class RefactoringEngine {
  private refactoringRules: Map<string, RefactoringRule> = new Map();

  constructor() {
    this.initializeRefactoringRules();
  }

  private initializeRefactoringRules() {
    // Extract method rule
    this.refactoringRules.set('extract_method', {
      name: 'Extract Method',
      description: 'Extract complex code into a separate method',
      condition: (item: ASTFunction | ASTClass) => {
        return 'complexity' in item && (item as ASTFunction).complexity > 8;
      },
      apply: (item: ASTFunction | ASTClass, content: string) => {
        return this.extractMethod(item as ASTFunction, content);
      }
    });

    // Extract class rule
    this.refactoringRules.set('extract_class', {
      name: 'Extract Class',
      description: 'Extract related functionality into a separate class',
      condition: (item: ASTFunction | ASTClass) => {
        return 'methods' in item && (item as ASTClass).methods.length > 8;
      },
      apply: (item: ASTFunction | ASTClass, content: string) => {
        return this.extractClass(item as ASTClass, content);
      }
    });

    // Simplify condition rule
    this.refactoringRules.set('simplify_condition', {
      name: 'Simplify Condition',
      description: 'Simplify complex conditional logic',
      condition: (_item: ASTFunction | ASTClass) => true,
      apply: (item: ASTFunction | ASTClass, content: string) => {
        return this.simplifyCondition(item as ASTFunction, content);
      }
    });

    // Optimize performance rule
    this.refactoringRules.set('optimize_performance', {
      name: 'Optimize Performance',
      description: 'Optimize code for better performance',
      condition: (_item: ASTFunction | ASTClass) => true,
      apply: (item: ASTFunction | ASTClass, content: string) => {
        return this.optimizePerformance(item as ASTFunction, content);
      }
    });
  }

  analyzeForRefactoring(parsedFile: ParsedFile, semanticAnalysis: SemanticAnalysis): RefactoringSuggestion[] {
    const suggestions: RefactoringSuggestion[] = [];

    // Analyze functions for refactoring opportunities
    parsedFile.functions.forEach(func => {
      const functionSuggestions = this.analyzeFunction(func, parsedFile);
      suggestions.push(...functionSuggestions);
    });

    // Analyze classes for refactoring opportunities
    parsedFile.classes.forEach(cls => {
      const classSuggestions = this.analyzeClass(cls, parsedFile);
      suggestions.push(...classSuggestions);
    });

    // Analyze based on semantic analysis
    const semanticSuggestions = this.analyzeSemanticIssues(semanticAnalysis, parsedFile);
    suggestions.push(...semanticSuggestions);

    return suggestions.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aScore = severityOrder[a.severity] * a.confidence;
      const bScore = severityOrder[b.severity] * b.confidence;
      return bScore - aScore;
    });
  }

  private analyzeFunction(func: ASTFunction, parsedFile: ParsedFile): RefactoringSuggestion[] {
    const suggestions: RefactoringSuggestion[] = [];

    // Check for long functions
    if (func.complexity > 10) {
      suggestions.push({
        id: `extract_method_${func.name}`,
        type: 'extract_method',
        title: `Extract method from ${func.name}`,
        description: `Function '${func.name}' is too complex (complexity: ${func.complexity}). Consider extracting parts into smaller methods.`,
        severity: 'medium',
        line: func.line,
        confidence: 0.9,
        codeChanges: [],
        before: func.body,
        after: this.generateExtractedMethodCode(func),
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Check for deep nesting
    if (this.hasDeepNesting(func.body)) {
      suggestions.push({
        id: `simplify_nesting_${func.name}`,
        type: 'simplify',
        title: `Simplify nested conditions in ${func.name}`,
        description: `Function '${func.name}' has deeply nested conditions. Consider using early returns or guard clauses.`,
        severity: 'medium',
        line: func.line,
        confidence: 0.8,
        codeChanges: [],
        before: func.body,
        after: this.generateSimplifiedNestingCode(func),
        impact: 'medium',
        effort: 'low'
      });
    }

    // Check for magic numbers
    const magicNumbers = this.findMagicNumbers(func.body);
    if (magicNumbers.length > 0) {
      suggestions.push({
        id: `extract_constants_${func.name}`,
        type: 'simplify',
        title: `Extract magic numbers in ${func.name}`,
        description: `Function '${func.name}' contains magic numbers. Consider extracting them as named constants.`,
        severity: 'low',
        line: func.line,
        confidence: 0.7,
        codeChanges: [],
        before: func.body,
        after: this.generateConstantsCode(func, magicNumbers),
        impact: 'low',
        effort: 'low'
      });
    }

    return suggestions;
  }

  private analyzeClass(cls: ASTClass, parsedFile: ParsedFile): RefactoringSuggestion[] {
    const suggestions: RefactoringSuggestion[] = [];

    // Check for large classes
    if (cls.methods.length > 10) {
      suggestions.push({
        id: `extract_class_${cls.name}`,
        type: 'extract_class',
        title: `Extract class from ${cls.name}`,
        description: `Class '${cls.name}' has too many methods (${cls.methods.length}). Consider extracting related functionality into separate classes.`,
        severity: 'medium',
        line: cls.line,
        confidence: 0.8,
        codeChanges: [],
        before: this.getClassCode(cls),
        after: this.generateExtractedClassCode(cls),
        impact: 'high',
        effort: 'high'
      });
    }

    // Check for mixed responsibilities
    if (this.hasMixedResponsibilities(cls)) {
      suggestions.push({
        id: `separate_responsibilities_${cls.name}`,
        type: 'extract_class',
        title: `Separate responsibilities in ${cls.name}`,
        description: `Class '${cls.name}' has mixed responsibilities. Consider applying the Single Responsibility Principle.`,
        severity: 'high',
        line: cls.line,
        confidence: 0.7,
        codeChanges: [],
        before: this.getClassCode(cls),
        after: this.generateSeparatedResponsibilitiesCode(cls),
        impact: 'high',
        effort: 'high'
      });
    }

    return suggestions;
  }

  private analyzeSemanticIssues(semanticAnalysis: SemanticAnalysis, parsedFile: ParsedFile): RefactoringSuggestion[] {
    const suggestions: RefactoringSuggestion[] = [];

    // Handle architectural issues
    semanticAnalysis.architecturalIssues.forEach(issue => {
      if (issue.type === 'coupling') {
        suggestions.push({
          id: `reduce_coupling_${Date.now()}`,
          type: 'extract_class',
          title: 'Reduce coupling',
          description: issue.description,
          severity: 'medium',
          confidence: 0.8,
          codeChanges: [],
          before: '',
          after: this.generateDecoupledCode(issue),
          impact: 'high',
          effort: 'high'
        });
      }
    });

    // Handle performance issues
    semanticAnalysis.performanceIssues.forEach(issue => {
      if (issue.type === 'inefficient_algorithm') {
        suggestions.push({
          id: `optimize_algorithm_${Date.now()}`,
          type: 'optimize',
          title: 'Optimize algorithm',
          description: issue.description,
          severity: 'medium',
          line: issue.line,
          confidence: 0.7,
          codeChanges: [],
          before: '',
          after: this.generateOptimizedCode(issue),
          impact: 'medium',
          effort: 'medium'
        });
      }
    });

    // Handle security issues
    semanticAnalysis.securityIssues.forEach(issue => {
      suggestions.push({
        id: `fix_security_${Date.now()}`,
        type: 'security',
        title: 'Fix security issue',
        description: issue.description,
        severity: 'critical',
        line: issue.line,
        confidence: 0.9,
        codeChanges: [],
        before: '',
        after: this.generateSecureCode(issue),
        impact: 'high',
        effort: 'medium'
      });
    });

    return suggestions;
  }

  applyRefactoring(suggestion: RefactoringSuggestion, document: vscode.TextDocument): RefactoringResult {
    const changes: CodeChange[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      switch (suggestion.type) {
        case 'extract_method':
          changes.push(...this.applyExtractMethod(suggestion, document));
          break;
        case 'extract_class':
          changes.push(...this.applyExtractClass(suggestion, document));
          break;
        case 'simplify':
          changes.push(...this.applySimplify(suggestion, document));
          break;
        case 'optimize':
          changes.push(...this.applyOptimize(suggestion, document));
          break;
        case 'security':
          changes.push(...this.applySecurityFix(suggestion, document));
          break;
        default:
          errors.push(`Unknown refactoring type: ${suggestion.type}`);
      }
    } catch (error: any) {
      errors.push(`Failed to apply refactoring: ${error.message}`);
    }

    return {
      success: errors.length === 0,
      changes,
      suggestions: [],
      errors,
      warnings
    };
  }

  private applyExtractMethod(suggestion: RefactoringSuggestion, document: vscode.TextDocument): CodeChange[] {
    const changes: CodeChange[] = [];
    
    changes.push({
      type: 'insert',
      line: suggestion.line || 1,
      column: 0,
      newText: suggestion.after,
      description: 'Extract method refactoring'
    });

    return changes;
  }

  private applyExtractClass(suggestion: RefactoringSuggestion, document: vscode.TextDocument): CodeChange[] {
    const changes: CodeChange[] = [];
    
    changes.push({
      type: 'insert',
      line: suggestion.line || 1,
      column: 0,
      newText: suggestion.after,
      description: 'Extract class refactoring'
    });

    return changes;
  }

  private applySimplify(suggestion: RefactoringSuggestion, document: vscode.TextDocument): CodeChange[] {
    const changes: CodeChange[] = [];
    
    changes.push({
      type: 'replace',
      line: suggestion.line || 1,
      column: 0,
      oldText: suggestion.before,
      newText: suggestion.after,
      description: 'Simplify code refactoring'
    });

    return changes;
  }

  private applyOptimize(suggestion: RefactoringSuggestion, document: vscode.TextDocument): CodeChange[] {
    const changes: CodeChange[] = [];
    
    changes.push({
      type: 'replace',
      line: suggestion.line || 1,
      column: 0,
      oldText: suggestion.before,
      newText: suggestion.after,
      description: 'Performance optimization'
    });

    return changes;
  }

  private applySecurityFix(suggestion: RefactoringSuggestion, document: vscode.TextDocument): CodeChange[] {
    const changes: CodeChange[] = [];
    
    changes.push({
      type: 'replace',
      line: suggestion.line || 1,
      column: 0,
      oldText: suggestion.before,
      newText: suggestion.after,
      description: 'Security fix'
    });

    return changes;
  }

  // Helper methods for code generation
  private generateExtractedMethodCode(func: ASTFunction): string {
    return `
  private extractedMethod(): void {
    // TODO: Extract complex logic here
  }

  public ${func.name}(${func.parameters.join(', ')}): ${func.returnType || 'void'} {
    // Simplified version of the original function
    this.extractedMethod();
  }
`;
  }

  private generateSimplifiedNestingCode(func: ASTFunction): string {
    return `
  public ${func.name}(${func.parameters.join(', ')}): ${func.returnType || 'void'} {
    // Early returns to reduce nesting
    if (!condition1) return;
    if (!condition2) return;
    
    // Main logic here
  }
`;
  }

  private generateConstantsCode(func: ASTFunction, magicNumbers: number[]): string {
    const constants = magicNumbers.map((num, index) => 
      `  private static readonly CONSTANT_${index + 1} = ${num};`
    ).join('\n');

    return `
${constants}

  public ${func.name}(${func.parameters.join(', ')}): ${func.returnType || 'void'} {
    // Use constants instead of magic numbers
  }
`;
  }

  private generateExtractedClassCode(cls: ASTClass): string {
    return `
// Extracted class for related functionality
export class ${cls.name}Helper {
  // TODO: Extract related methods here
}

export class ${cls.name} {
  private helper = new ${cls.name}Helper();
  
  // Simplified class with fewer responsibilities
}
`;
  }

  private generateSeparatedResponsibilitiesCode(cls: ASTClass): string {
    return `
// Separate classes for different responsibilities
export class ${cls.name}DataManager {
  // Data management responsibilities
}

export class ${cls.name}BusinessLogic {
  // Business logic responsibilities
}

export class ${cls.name} {
  private dataManager = new ${cls.name}DataManager();
  private businessLogic = new ${cls.name}BusinessLogic();
  
  // Coordinate between different responsibilities
}
`;
  }

  private generateDecoupledCode(issue: any): string {
    return `
// Decoupled implementation using dependency injection
export interface ServiceInterface {
  // Define interface for loose coupling
}

export class DecoupledClass {
  constructor(private service: ServiceInterface) {}
  
  // Use dependency injection for loose coupling
}
`;
  }

  private generateOptimizedCode(issue: any): string {
    return `
// Optimized implementation
export function optimizedFunction(): void {
  // Use more efficient algorithms
  // Cache results where appropriate
  // Avoid unnecessary computations
}
`;
  }

  private generateSecureCode(issue: any): string {
    return `
// Secure implementation
export function secureFunction(input: string): string {
  // Sanitize input
  const sanitizedInput = sanitizeInput(input);
  
  // Use parameterized queries
  // Validate all inputs
  // Handle errors securely
}
`;
  }

  // Utility methods
  private hasDeepNesting(code: string): boolean {
    const lines = code.split('\n');
    let maxNesting = 0;
    let currentNesting = 0;

    for (const line of lines) {
      if (line.includes('{')) currentNesting++;
      if (line.includes('}')) currentNesting--;
      maxNesting = Math.max(maxNesting, currentNesting);
    }

    return maxNesting > 3;
  }

  private findMagicNumbers(code: string): number[] {
    const numbers: number[] = [];
    const regex = /\b\d{2,}\b/g;
    let match;

    while ((match = regex.exec(code)) !== null) {
      const num = parseInt(match[0]);
      if (num > 10 && !numbers.includes(num)) {
        numbers.push(num);
      }
    }

    return numbers;
  }

  private hasMixedResponsibilities(cls: ASTClass): boolean {
    const methodNames = cls.methods.map(m => m.name.toLowerCase());
    const hasDataMethods = methodNames.some(name => 
      name.includes('save') || name.includes('load') || name.includes('fetch')
    );
    const hasBusinessMethods = methodNames.some(name => 
      name.includes('calculate') || name.includes('process') || name.includes('validate')
    );
    const hasUIMethods = methodNames.some(name => 
      name.includes('render') || name.includes('display') || name.includes('show')
    );

    return (hasDataMethods && hasBusinessMethods) || 
           (hasDataMethods && hasUIMethods) || 
           (hasBusinessMethods && hasUIMethods);
  }

  private getClassCode(cls: ASTClass): string {
    return `
export class ${cls.name} {
  ${cls.methods.map(m => `
  public ${m.name}(${m.parameters.join(', ')}): ${m.returnType || 'void'} {
    // Method implementation
  }`).join('')}
}
`;
  }

  // Placeholder methods for refactoring rules
  private extractMethod(func: ASTFunction, content: string): RefactoringSuggestion {
    return {
      id: `extract_${func.name}`,
      type: 'extract_method',
      title: `Extract method from ${func.name}`,
      description: 'Extract complex logic into separate method',
      severity: 'medium',
      confidence: 0.8,
      codeChanges: [],
      before: func.body,
      after: this.generateExtractedMethodCode(func),
      impact: 'medium',
      effort: 'medium'
    };
  }

  private extractClass(cls: ASTClass, content: string): RefactoringSuggestion {
    return {
      id: `extract_class_${cls.name}`,
      type: 'extract_class',
      title: `Extract class from ${cls.name}`,
      description: 'Extract related functionality into separate class',
      severity: 'medium',
      confidence: 0.8,
      codeChanges: [],
      before: this.getClassCode(cls),
      after: this.generateExtractedClassCode(cls),
      impact: 'high',
      effort: 'high'
    };
  }

  private simplifyCondition(func: ASTFunction, content: string): RefactoringSuggestion {
    return {
      id: `simplify_${func.name}`,
      type: 'simplify',
      title: `Simplify conditions in ${func.name}`,
      description: 'Simplify complex conditional logic',
      severity: 'low',
      confidence: 0.7,
      codeChanges: [],
      before: func.body,
      after: this.generateSimplifiedNestingCode(func),
      impact: 'low',
      effort: 'low'
    };
  }

  private optimizePerformance(func: ASTFunction, content: string): RefactoringSuggestion {
    return {
      id: `optimize_${func.name}`,
      type: 'optimize',
      title: `Optimize ${func.name}`,
      description: 'Optimize code for better performance',
      severity: 'medium',
      confidence: 0.6,
      codeChanges: [],
      before: func.body,
      after: this.generateOptimizedCode({}),
      impact: 'medium',
      effort: 'medium'
    };
  }
} 