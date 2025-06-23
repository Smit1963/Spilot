import * as vscode from 'vscode';
import { ErrorContext, CodeContext } from './context-manager';

export interface ErrorAnalysis {
  errorType: 'compilation' | 'runtime' | 'syntax' | 'type' | 'import' | 'dependency' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rootCause: string;
  suggestedFixes: ErrorFix[];
  relatedFiles: string[];
  confidence: number; // 0-1
}

export interface ErrorFix {
  type: 'code_change' | 'import_add' | 'dependency_install' | 'configuration' | 'syntax_fix';
  description: string;
  code?: string;
  file?: string;
  line?: number;
  command?: string;
  explanation: string;
}

export class ErrorAnalyzer {
  private context: CodeContext;

  constructor(context: CodeContext) {
    this.context = context;
  }

  analyzeError(error: ErrorContext): ErrorAnalysis {
    const errorMessage = error.message.toLowerCase();
    
    // TypeScript/JavaScript errors
    if (this.isTypeScriptError(errorMessage)) {
      return this.analyzeTypeScriptError(error);
    }
    
    // Python errors
    if (this.isPythonError(errorMessage)) {
      return this.analyzePythonError(error);
    }
    
    // Import/module errors
    if (this.isImportError(errorMessage)) {
      return this.analyzeImportError(error);
    }
    
    // Dependency errors
    if (this.isDependencyError(errorMessage)) {
      return this.analyzeDependencyError(error);
    }
    
    // Syntax errors
    if (this.isSyntaxError(errorMessage)) {
      return this.analyzeSyntaxError(error);
    }
    
    // Runtime errors
    if (this.isRuntimeError(errorMessage)) {
      return this.analyzeRuntimeError(error);
    }
    
    // Default analysis
    return this.analyzeGenericError(error);
  }

  private isTypeScriptError(message: string): boolean {
    return message.includes('typescript') || 
           message.includes('ts') || 
           message.includes('type') ||
           message.includes('interface') ||
           message.includes('cannot find') ||
           message.includes('does not exist');
  }

  private isPythonError(message: string): boolean {
    return message.includes('python') || 
           message.includes('py') || 
           message.includes('indentation') ||
           message.includes('syntaxerror') ||
           message.includes('nameerror') ||
           message.includes('typeerror') ||
           message.includes('attributeerror');
  }

  private isImportError(message: string): boolean {
    return message.includes('import') || 
           message.includes('module') || 
           message.includes('cannot find module') ||
           message.includes('module not found') ||
           message.includes('import error') ||
           message.includes('no module named');
  }

  private isDependencyError(message: string): boolean {
    return message.includes('npm') || 
           message.includes('yarn') || 
           message.includes('package') ||
           message.includes('dependency') ||
           message.includes('peer dependency') ||
           message.includes('version conflict');
  }

  private isSyntaxError(message: string): boolean {
    return message.includes('syntax') || 
           message.includes('unexpected') || 
           message.includes('missing') ||
           message.includes('unterminated') ||
           message.includes('unexpected token');
  }

  private isRuntimeError(message: string): boolean {
    return message.includes('runtime') || 
           message.includes('exception') || 
           message.includes('error') ||
           message.includes('failed') ||
           message.includes('crashed');
  }

  private analyzeTypeScriptError(error: ErrorContext): ErrorAnalysis {
    const message = error.message.toLowerCase();
    const fixes: ErrorFix[] = [];
    let errorType: ErrorAnalysis['errorType'] = 'type';
    let severity: ErrorAnalysis['severity'] = 'medium';
    let description = 'TypeScript compilation error';
    let rootCause = 'Type checking or compilation issue';
    let confidence = 0.8;

    // Type errors
    if (message.includes('type') && message.includes('not assignable')) {
      errorType = 'type';
      severity = 'medium';
      description = 'Type mismatch error';
      rootCause = 'Variable or parameter type does not match expected type';
      
      fixes.push({
        type: 'code_change',
        description: 'Fix type annotation or value assignment',
        explanation: 'Ensure the variable type matches the expected type or update the type definition'
      });
    }
    
    // Interface errors
    else if (message.includes('interface') || message.includes('implements')) {
      errorType = 'type';
      severity = 'medium';
      description = 'Interface implementation error';
      rootCause = 'Class does not properly implement required interface';
      
      fixes.push({
        type: 'code_change',
        description: 'Implement missing interface methods or properties',
        explanation: 'Add the missing methods or properties required by the interface'
      });
    }
    
    // Cannot find name/type
    else if (message.includes('cannot find name') || message.includes('does not exist')) {
      errorType = 'import';
      severity = 'high';
      description = 'Undefined variable or type error';
      rootCause = 'Variable, function, or type is not defined or imported';
      
      fixes.push({
        type: 'import_add',
        description: 'Add missing import statement',
        explanation: 'Import the missing module, type, or function'
      });
      
      fixes.push({
        type: 'code_change',
        description: 'Define the missing variable or function',
        explanation: 'Declare the variable or define the function in the current scope'
      });
    }

    return {
      errorType,
      severity,
      description,
      rootCause,
      suggestedFixes: fixes,
      relatedFiles: error.file ? [error.file] : [],
      confidence
    };
  }

  private analyzePythonError(error: ErrorContext): ErrorAnalysis {
    const message = error.message.toLowerCase();
    const fixes: ErrorFix[] = [];
    let errorType: ErrorAnalysis['errorType'] = 'syntax';
    let severity: ErrorAnalysis['severity'] = 'medium';
    let description = 'Python error';
    let rootCause = 'Python execution error';
    let confidence = 0.8;

    // Indentation errors
    if (message.includes('indentation')) {
      errorType = 'syntax';
      severity = 'high';
      description = 'Indentation error';
      rootCause = 'Incorrect indentation in Python code';
      
      fixes.push({
        type: 'syntax_fix',
        description: 'Fix indentation',
        explanation: 'Ensure consistent indentation (4 spaces per level)'
      });
    }
    
    // Name errors
    else if (message.includes('nameerror') || message.includes('name')) {
      errorType = 'runtime';
      severity = 'medium';
      description = 'Name error';
      rootCause = 'Variable or function name is not defined';
      
      fixes.push({
        type: 'code_change',
        description: 'Define the missing variable or function',
        explanation: 'Declare the variable or define the function before using it'
      });
      
      fixes.push({
        type: 'import_add',
        description: 'Add missing import',
        explanation: 'Import the module containing the missing name'
      });
    }
    
    // Import errors
    else if (message.includes('importerror') || message.includes('no module named')) {
      errorType = 'import';
      severity = 'high';
      description = 'Import error';
      rootCause = 'Module not found or not installed';
      
      fixes.push({
        type: 'dependency_install',
        description: 'Install missing package',
        command: 'pip install <package_name>',
        explanation: 'Install the required package using pip'
      });
      
      fixes.push({
        type: 'code_change',
        description: 'Fix import statement',
        explanation: 'Correct the import path or module name'
      });
    }

    return {
      errorType,
      severity,
      description,
      rootCause,
      suggestedFixes: fixes,
      relatedFiles: error.file ? [error.file] : [],
      confidence
    };
  }

  private analyzeImportError(error: ErrorContext): ErrorAnalysis {
    const message = error.message.toLowerCase();
    const fixes: ErrorFix[] = [];
    
    // Node.js module errors
    if (message.includes('cannot find module') || message.includes('module not found')) {
      const moduleName = this.extractModuleName(message);
      
      fixes.push({
        type: 'dependency_install',
        description: `Install missing package: ${moduleName}`,
        command: `npm install ${moduleName}`,
        explanation: `Install the missing npm package`
      });
      
      fixes.push({
        type: 'code_change',
        description: 'Fix import path',
        explanation: 'Correct the import path to match the actual file location'
      });
    }
    
    // Python import errors
    else if (message.includes('no module named')) {
      const moduleName = this.extractModuleName(message);
      
      fixes.push({
        type: 'dependency_install',
        description: `Install missing package: ${moduleName}`,
        command: `pip install ${moduleName}`,
        explanation: `Install the missing Python package`
      });
    }

    return {
      errorType: 'import',
      severity: 'high',
      description: 'Module import error',
      rootCause: 'Required module is not found or not properly imported',
      suggestedFixes: fixes,
      relatedFiles: error.file ? [error.file] : [],
      confidence: 0.9
    };
  }

  private analyzeDependencyError(error: ErrorContext): ErrorAnalysis {
    const message = error.message.toLowerCase();
    const fixes: ErrorFix[] = [];
    
    if (message.includes('peer dependency')) {
      fixes.push({
        type: 'dependency_install',
        description: 'Install peer dependencies',
        command: 'npm install',
        explanation: 'Install all peer dependencies'
      });
    }
    
    if (message.includes('version conflict')) {
      fixes.push({
        type: 'dependency_install',
        description: 'Resolve version conflicts',
        command: 'npm audit fix',
        explanation: 'Automatically fix dependency version conflicts'
      });
    }

    return {
      errorType: 'dependency',
      severity: 'medium',
      description: 'Dependency management error',
      rootCause: 'Package dependency issue or version conflict',
      suggestedFixes: fixes,
      relatedFiles: ['package.json', 'package-lock.json'],
      confidence: 0.85
    };
  }

  private analyzeSyntaxError(error: ErrorContext): ErrorAnalysis {
    const message = error.message.toLowerCase();
    const fixes: ErrorFix[] = [];
    
    if (message.includes('unexpected token')) {
      fixes.push({
        type: 'syntax_fix',
        description: 'Fix syntax error',
        explanation: 'Check for missing brackets, semicolons, or other syntax elements'
      });
    }
    
    if (message.includes('unterminated')) {
      fixes.push({
        type: 'syntax_fix',
        description: 'Fix unterminated string or comment',
        explanation: 'Add missing closing quotes or comment markers'
      });
    }

    return {
      errorType: 'syntax',
      severity: 'high',
      description: 'Syntax error',
      rootCause: 'Invalid syntax in the code',
      suggestedFixes: fixes,
      relatedFiles: error.file ? [error.file] : [],
      confidence: 0.9
    };
  }

  private analyzeRuntimeError(error: ErrorContext): ErrorAnalysis {
    const fixes: ErrorFix[] = [];
    
    fixes.push({
      type: 'code_change',
      description: 'Debug runtime error',
      explanation: 'Add error handling, check variable values, and validate input data'
    });

    return {
      errorType: 'runtime',
      severity: 'high',
      description: 'Runtime error',
      rootCause: 'Error occurring during program execution',
      suggestedFixes: fixes,
      relatedFiles: error.file ? [error.file] : [],
      confidence: 0.7
    };
  }

  private analyzeGenericError(error: ErrorContext): ErrorAnalysis {
    return {
      errorType: 'unknown',
      severity: 'medium',
      description: 'Unknown error type',
      rootCause: 'Unable to determine specific error cause',
      suggestedFixes: [{
        type: 'code_change',
        description: 'Review error message and code',
        explanation: 'Manually review the error and the code around the error location'
      }],
      relatedFiles: error.file ? [error.file] : [],
      confidence: 0.5
    };
  }

  private extractModuleName(message: string): string {
    // Extract module name from common error patterns
    const patterns = [
      /cannot find module ['"`]([^'"`]+)['"`]/i,
      /no module named ['"`]([^'"`]+)['"`]/i,
      /module ['"`]([^'"`]+)['"`] not found/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return 'unknown';
  }

  getErrorContext(error: ErrorContext): string {
    if (!error.file) {
      return 'Error occurred without specific file context';
    }

    const file = this.context.workspaceFiles.find(f => f.path === error.file);
    if (!file || !file.content) {
      return `Error in file: ${error.file}`;
    }

    const lines = file.content.split('\n');
    const errorLine = error.line ? error.line - 1 : 0;
    const startLine = Math.max(0, errorLine - 2);
    const endLine = Math.min(lines.length - 1, errorLine + 2);

    let context = `Error in ${error.file}:\n\n`;
    
    for (let i = startLine; i <= endLine; i++) {
      const lineNumber = i + 1;
      const marker = i === errorLine ? '>>> ' : '    ';
      context += `${marker}${lineNumber}: ${lines[i]}\n`;
    }

    return context;
  }

  suggestRelatedFiles(error: ErrorContext): string[] {
    const relatedFiles: string[] = [];
    
    // Add current file if available
    if (error.file) {
      relatedFiles.push(error.file);
    }
    
    // Add related files based on error type
    const analysis = this.analyzeError(error);
    
    if (analysis.errorType === 'import') {
      // Look for files that might contain the missing import
      this.context.workspaceFiles.forEach(file => {
        if (file.name.includes(analysis.rootCause.toLowerCase()) || 
            file.content?.includes(analysis.rootCause.toLowerCase())) {
          relatedFiles.push(file.path);
        }
      });
    }
    
    return [...new Set(relatedFiles)]; // Remove duplicates
  }

  parseError(errorMessage: string): ErrorAnalysis {
    // Create a temporary error context for parsing
    const errorContext: ErrorContext = {
      message: errorMessage,
      timestamp: new Date(),
      resolved: false
    };
    
    return this.analyzeError(errorContext);
  }
} 