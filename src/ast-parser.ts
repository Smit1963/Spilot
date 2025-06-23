import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ASTNode {
  type: string;
  name?: string;
  line: number;
  column: number;
  children?: ASTNode[];
  value?: string;
  parameters?: string[];
  returnType?: string;
  modifiers?: string[];
}

export interface ParsedFile {
  path: string;
  language: string;
  functions: ASTFunction[];
  classes: ASTClass[];
  imports: ASTImport[];
  exports: ASTExport[];
  variables: ASTVariable[];
  dependencies: string[];
  complexity: number;
}

export interface ASTFunction {
  name: string;
  line: number;
  parameters: string[];
  returnType?: string;
  modifiers: string[];
  body: string;
  complexity: number;
  calls: string[];
}

export interface ASTClass {
  name: string;
  line: number;
  methods: ASTFunction[];
  properties: ASTProperty[];
  extends?: string;
  implements?: string[];
  modifiers: string[];
}

export interface ASTProperty {
  name: string;
  line: number;
  type?: string;
  modifiers: string[];
  defaultValue?: string;
}

export interface ASTImport {
  module: string;
  imports: string[];
  line: number;
  isDefault: boolean;
}

export interface ASTExport {
  name: string;
  type: 'function' | 'class' | 'variable' | 'interface' | 'type';
  line: number;
}

export interface ASTVariable {
  name: string;
  line: number;
  type?: string;
  value?: string;
  scope: 'global' | 'function' | 'block';
}

export class ASTParser {
  private supportedLanguages = ['typescript', 'javascript', 'tsx', 'jsx'];

  async parseFile(filePath: string, content: string): Promise<ParsedFile> {
    const language = this.getLanguageFromPath(filePath);
    
    if (!this.supportedLanguages.includes(language)) {
      return this.createEmptyParsedFile(filePath, language);
    }

    try {
      const functions = this.parseFunctions(content, language);
      const classes = this.parseClasses(content, language);
      const imports = this.parseImports(content, language);
      const exports = this.parseExports(content, language);
      const variables = this.parseVariables(content, language);
      const dependencies = this.extractDependencies(imports);

      return {
        path: filePath,
        language,
        functions,
        classes,
        imports,
        exports,
        variables,
        dependencies,
        complexity: this.calculateComplexity(functions, classes)
      };
    } catch (error) {
      console.error(`Error parsing file ${filePath}:`, error);
      return this.createEmptyParsedFile(filePath, language);
    }
  }

  private parseFunctions(content: string, language: string): ASTFunction[] {
    const functions: ASTFunction[] = [];
    const lines = content.split('\n');

    const patterns = [
      /^(export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
      /^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/,
      /^(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?function\s*\(([^)]*)\)/
    ];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const functionName = match[3] || match[2];
          const parameters = this.parseParameters(match[4] || match[3] || match[2]);
          const modifiers = this.extractModifiers(trimmedLine);
          
          functions.push({
            name: functionName,
            line: index + 1,
            parameters,
            modifiers,
            body: this.extractFunctionBody(content, index),
            complexity: this.calculateFunctionComplexity(content, index),
            calls: this.extractFunctionCalls(content, index)
          });
          break;
        }
      }
    });

    return functions;
  }

  private parseClasses(content: string, language: string): ASTClass[] {
    const classes: ASTClass[] = [];
    const lines = content.split('\n');

    const classPattern = /^(export\s+)?(abstract\s+)?class\s+(\w+)(\s+extends\s+(\w+))?(\s+implements\s+([^{]+))?/;

    lines.forEach((line, index) => {
      const match = line.match(classPattern);
      if (match) {
        const className = match[3];
        const extendsClass = match[5];
        const implementsInterfaces = match[7] ? match[7].split(',').map(i => i.trim()) : [];
        const modifiers = this.extractModifiers(line);

        const methods = this.findClassMethods(content, index, className);
        const properties = this.findClassProperties(content, index, className);

        classes.push({
          name: className,
          line: index + 1,
          methods,
          properties,
          extends: extendsClass,
          implements: implementsInterfaces,
          modifiers
        });
      }
    });

    return classes;
  }

  private parseImports(content: string, language: string): ASTImport[] {
    const imports: ASTImport[] = [];
    const lines = content.split('\n');

    const patterns = [
      /^import\s+{([^}]+)}\s+from\s+['"`]([^'"`]+)['"`]/,
      /^import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/,
      /^import\s+\*\s+as\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/,
      /^import\s+['"`]([^'"`]+)['"`]/
    ];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const module = match[2] || match[1];
          const importsList = match[1] ? match[1].split(',').map(i => i.trim()) : [];
          const isDefault = !match[1] || match[1].includes('* as');

          imports.push({
            module,
            imports: importsList,
            line: index + 1,
            isDefault
          });
          break;
        }
      }
    });

    return imports;
  }

  private parseExports(content: string, language: string): ASTExport[] {
    const exports: ASTExport[] = [];
    const lines = content.split('\n');

    const patterns = [
      /^export\s+(function|class|const|let|var|interface|type)\s+(\w+)/,
      /^export\s+{([^}]+)}/,
      /^export\s+default\s+(\w+)/
    ];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const exportType = match[1] as any;
          const exportName = match[2] || match[1];

          exports.push({
            name: exportName,
            type: exportType,
            line: index + 1
          });
          break;
        }
      }
    });

    return exports;
  }

  private parseVariables(content: string, language: string): ASTVariable[] {
    const variables: ASTVariable[] = [];
    const lines = content.split('\n');

    const patterns = [
      /^(const|let|var)\s+(\w+)(\s*:\s*([^=]+))?\s*=\s*(.+)/,
      /^(const|let|var)\s+(\w+)\s*:\s*([^=;]+)/
    ];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      for (const pattern of patterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const varName = match[2];
          const varType = match[4] || match[3];
          const varValue = match[5];
          const scope = this.determineVariableScope(content, index);

          variables.push({
            name: varName,
            line: index + 1,
            type: varType,
            value: varValue,
            scope
          });
          break;
        }
      }
    });

    return variables;
  }

  private parseParameters(paramString: string): string[] {
    if (!paramString) return [];
    
    return paramString
      .split(',')
      .map(param => param.trim())
      .filter(param => param.length > 0)
      .map(param => {
        return param.split(':')[0].split('=')[0].trim();
      });
  }

  private extractModifiers(line: string): string[] {
    const modifiers: string[] = [];
    
    if (line.includes('export')) modifiers.push('export');
    if (line.includes('async')) modifiers.push('async');
    if (line.includes('abstract')) modifiers.push('abstract');
    if (line.includes('static')) modifiers.push('static');
    if (line.includes('private')) modifiers.push('private');
    if (line.includes('protected')) modifiers.push('protected');
    if (line.includes('public')) modifiers.push('public');
    if (line.includes('readonly')) modifiers.push('readonly');
    
    return modifiers;
  }

  private extractFunctionBody(content: string, startLine: number): string {
    const lines = content.split('\n');
    let braceCount = 0;
    let inFunction = false;
    let bodyLines: string[] = [];

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      if (!inFunction && line.includes('{')) {
        inFunction = true;
        braceCount = 1;
        continue;
      }

      if (inFunction) {
        bodyLines.push(line);
        
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        if (braceCount === 0) break;
      }
    }

    return bodyLines.join('\n');
  }

  private calculateFunctionComplexity(content: string, startLine: number): number {
    const body = this.extractFunctionBody(content, startLine);
    let complexity = 1;

    const controlFlowPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\bthrow\b/g,
      /\breturn\b/g
    ];

    for (const pattern of controlFlowPatterns) {
      const matches = body.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  private extractFunctionCalls(content: string, startLine: number): string[] {
    const body = this.extractFunctionBody(content, startLine);
    const calls: string[] = [];
    
    const callPattern = /(\w+)\s*\(/g;
    let match;
    
    while ((match = callPattern.exec(body)) !== null) {
      const functionName = match[1];
      if (!['if', 'for', 'while', 'switch', 'catch', 'console', 'Math', 'Array', 'Object', 'String', 'Number'].includes(functionName)) {
        calls.push(functionName);
      }
    }

    return [...new Set(calls)];
  }

  private findClassMethods(content: string, classStartLine: number, className: string): ASTFunction[] {
    const methods: ASTFunction[] = [];
    const lines = content.split('\n');
    let inClass = false;
    let braceCount = 0;

    for (let i = classStartLine; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes(`class ${className}`)) {
        inClass = true;
        braceCount = 1;
        continue;
      }

      if (inClass) {
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        if (braceCount === 0) break;

        const methodPattern = /^\s*(async\s+)?(\w+)\s*\(([^)]*)\)/;
        const match = line.match(methodPattern);
        
        if (match && !['constructor', 'get', 'set'].includes(match[2])) {
          methods.push({
            name: match[2],
            line: i + 1,
            parameters: this.parseParameters(match[3]),
            modifiers: this.extractModifiers(line),
            body: this.extractFunctionBody(content, i),
            complexity: this.calculateFunctionComplexity(content, i),
            calls: this.extractFunctionCalls(content, i)
          });
        }
      }
    }

    return methods;
  }

  private findClassProperties(content: string, classStartLine: number, className: string): ASTProperty[] {
    const properties: ASTProperty[] = [];
    const lines = content.split('\n');
    let inClass = false;
    let braceCount = 0;

    for (let i = classStartLine; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes(`class ${className}`)) {
        inClass = true;
        braceCount = 1;
        continue;
      }

      if (inClass) {
        for (const char of line) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }

        if (braceCount === 0) break;

        const propertyPattern = /^\s*(\w+)(\s*:\s*([^=;]+))?(\s*=\s*(.+))?;?$/;
        const match = line.match(propertyPattern);
        
        if (match && !['constructor', 'get', 'set'].includes(match[1])) {
          properties.push({
            name: match[1],
            line: i + 1,
            type: match[3],
            modifiers: this.extractModifiers(line),
            defaultValue: match[5]
          });
        }
      }
    }

    return properties;
  }

  private determineVariableScope(content: string, lineNumber: number): 'global' | 'function' | 'block' {
    const lines = content.split('\n');
    let braceCount = 0;
    let functionCount = 0;

    for (let i = 0; i < lineNumber; i++) {
      const line = lines[i];
      
      if (line.includes('function') || line.includes('=>')) {
        functionCount++;
      }

      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
    }

    if (functionCount === 0) return 'global';
    if (braceCount <= 1) return 'function';
    return 'block';
  }

  private extractDependencies(imports: ASTImport[]): string[] {
    return imports.map(imp => imp.module);
  }

  private calculateComplexity(functions: ASTFunction[], classes: ASTClass[]): number {
    let totalComplexity = 0;
    
    functions.forEach(func => {
      totalComplexity += func.complexity;
    });
    
    classes.forEach(cls => {
      cls.methods.forEach(method => {
        totalComplexity += method.complexity;
      });
    });
    
    return totalComplexity;
  }

  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath);
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'tsx',
      '.jsx': 'jsx'
    };
    
    return languageMap[ext] || 'unknown';
  }

  private createEmptyParsedFile(filePath: string, language: string): ParsedFile {
    return {
      path: filePath,
      language,
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      variables: [],
      dependencies: [],
      complexity: 0
    };
  }
} 