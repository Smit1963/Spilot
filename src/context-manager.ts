import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface CodeContext {
  currentFile?: {
    path: string;
    content: string;
    language: string;
    cursorPosition?: vscode.Position;
    selection?: vscode.Selection;
  };
  workspaceFiles: WorkspaceFile[];
  terminalOutput: string[];
  recentErrors: ErrorContext[];
  projectStructure: ProjectStructure;
  dependencies: DependencyInfo;
}

export interface WorkspaceFile {
  path: string;
  name: string;
  language: string;
  size: number;
  lastModified: Date;
  content?: string;
  functions?: FunctionInfo[];
  classes?: ClassInfo[];
}

export interface FunctionInfo {
  name: string;
  line: number;
  parameters: string[];
}

export interface ClassInfo {
  name: string;
  line: number;
  methods: FunctionInfo[];
  properties: string[];
}

export interface ErrorContext {
  message: string;
  file?: string;
  line?: number;
  column?: number;
  timestamp: Date;
  resolved: boolean;
}

export interface ProjectStructure {
  root: string;
  files: string[];
  directories: string[];
  mainEntryPoints: string[];
  configFiles: string[];
}

export interface DependencyInfo {
  packageManager: 'npm' | 'yarn' | 'pip' | 'cargo' | 'go' | 'unknown';
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class ContextManager {
  private context: CodeContext;
  private fileWatcher?: vscode.FileSystemWatcher;
  private terminalOutput: string[] = [];

  constructor() {
    this.context = {
      workspaceFiles: [],
      terminalOutput: [],
      recentErrors: [],
      projectStructure: {
        root: '',
        files: [],
        directories: [],
        mainEntryPoints: [],
        configFiles: []
      },
      dependencies: {
        packageManager: 'unknown',
        dependencies: {}
      }
    };
  }

  async initialize(): Promise<void> {
    await this.analyzeWorkspace();
    this.setupFileWatcher();
    this.setupTerminalListener();
  }

  private async analyzeWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const root = workspaceFolders[0].uri.fsPath;
    this.context.projectStructure.root = root;
    await this.scanProjectStructure(root);
    await this.analyzeDependencies(root);
    await this.indexWorkspaceFiles(root);
  }

  private async scanProjectStructure(root: string): Promise<void> {
    const files: string[] = [];
    const directories: string[] = [];
    const mainEntryPoints: string[] = [];
    const configFiles: string[] = [];

    const scanDirectory = async (dir: string, relativePath: string = '') => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
              directories.push(relativeFilePath);
              await scanDirectory(fullPath, relativeFilePath);
            }
          } else {
            files.push(relativeFilePath);
            
            if (['main.ts', 'main.js', 'index.ts', 'index.js', 'app.ts', 'app.js'].includes(entry.name)) {
              mainEntryPoints.push(relativeFilePath);
            }
            
            if (['package.json', 'tsconfig.json', 'webpack.config.js'].includes(entry.name)) {
              configFiles.push(relativeFilePath);
            }
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
      }
    };

    await scanDirectory(root);
    
    this.context.projectStructure.files = files;
    this.context.projectStructure.directories = directories;
    this.context.projectStructure.mainEntryPoints = mainEntryPoints;
    this.context.projectStructure.configFiles = configFiles;
  }

  private async analyzeDependencies(root: string): Promise<void> {
    const packageJsonPath = path.join(root, 'package.json');

    try {
      if (await this.fileExists(packageJsonPath)) {
        const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        
        this.context.dependencies.packageManager = 'npm';
        this.context.dependencies.dependencies = packageJson.dependencies || {};
        this.context.dependencies.devDependencies = packageJson.devDependencies || {};
      }
    } catch (error) {
      console.error('Error analyzing dependencies:', error);
    }
  }

  private async indexWorkspaceFiles(root: string): Promise<void> {
    const workspaceFiles: WorkspaceFile[] = [];
    
    for (const filePath of this.context.projectStructure.files) {
      const fullPath = path.join(root, filePath);
      const ext = path.extname(filePath);
      const language = this.getLanguageFromExtension(ext);
      
      try {
        const stats = await fs.promises.stat(fullPath);
        
        const workspaceFile: WorkspaceFile = {
          path: filePath,
          name: path.basename(filePath),
          language,
          size: stats.size,
          lastModified: stats.mtime
        };

        if (this.isCodeFile(ext)) {
          try {
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            workspaceFile.content = content;
            
            if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
              workspaceFile.functions = this.parseJavaScriptFunctions(content);
              workspaceFile.classes = this.parseJavaScriptClasses(content);
            }
          } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
          }
        }
        
        workspaceFiles.push(workspaceFile);
      } catch (error) {
        console.error(`Error indexing file ${filePath}:`, error);
      }
    }
    
    this.context.workspaceFiles = workspaceFiles;
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.js': 'javascript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.go': 'go',
      '.rs': 'rust',
      '.html': 'html',
      '.css': 'css',
      '.json': 'json',
      '.md': 'markdown'
    };
    
    return languageMap[ext] || 'plaintext';
  }

  private isCodeFile(ext: string): boolean {
    return ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cpp', '.c', '.go', '.rs'].includes(ext);
  }

  private parseJavaScriptFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');
    
    const functionRegex = /^(export\s+)?(async\s+)?(function\s+(\w+)|(\w+)\s*[:=]\s*(async\s+)?function|(\w+)\s*[:=]\s*\([^)]*\)\s*=>)/;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(functionRegex);
      
      if (match) {
        const functionName = match[4] || match[5] || match[7];
        if (functionName) {
          functions.push({
            name: functionName,
            line: index + 1,
            parameters: this.extractParameters(trimmedLine)
          });
        }
      }
    });
    
    return functions;
  }

  private parseJavaScriptClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const lines = content.split('\n');
    
    const classRegex = /^export\s+class\s+(\w+)|^class\s+(\w+)/;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      const match = trimmedLine.match(classRegex);
      
      if (match) {
        const className = match[1] || match[2];
        classes.push({
          name: className,
          line: index + 1,
          methods: [],
          properties: []
        });
      }
    });
    
    return classes;
  }

  private extractParameters(line: string): string[] {
    const paramMatch = line.match(/\(([^)]*)\)/);
    if (!paramMatch) return [];
    
    return paramMatch[1]
      .split(',')
      .map(param => param.trim())
      .filter(param => param.length > 0)
      .map(param => param.split('=')[0].trim());
  }

  private setupFileWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }

    this.fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
    
    this.fileWatcher.onDidChange(async (uri) => {
      await this.updateFileInContext(uri.fsPath);
    });
    
    this.fileWatcher.onDidCreate(async (uri) => {
      await this.addFileToContext(uri.fsPath);
    });
    
    this.fileWatcher.onDidDelete((uri) => {
      this.removeFileFromContext(uri.fsPath);
    });
  }

  private setupTerminalListener(): void {
    // Note: VS Code doesn't provide direct terminal output listening
    // Terminal errors will be captured when user pastes them or through other means
  }

  private async updateFileInContext(filePath: string): Promise<void> {
    const relativePath = path.relative(this.context.projectStructure.root, filePath);
    const fileIndex = this.context.workspaceFiles.findIndex(f => f.path === relativePath);
    
    if (fileIndex !== -1) {
      try {
        const stats = await fs.promises.stat(filePath);
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const ext = path.extname(filePath);
        
        this.context.workspaceFiles[fileIndex].content = content;
        this.context.workspaceFiles[fileIndex].lastModified = stats.mtime;
        this.context.workspaceFiles[fileIndex].size = stats.size;
        
        if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
          this.context.workspaceFiles[fileIndex].functions = this.parseJavaScriptFunctions(content);
          this.context.workspaceFiles[fileIndex].classes = this.parseJavaScriptClasses(content);
        }
      } catch (error) {
        console.error(`Error updating file ${filePath}:`, error);
      }
    }
  }

  private async addFileToContext(filePath: string): Promise<void> {
    const relativePath = path.relative(this.context.projectStructure.root, filePath);
    const ext = path.extname(filePath);
    const language = this.getLanguageFromExtension(ext);
    
    try {
      const stats = await fs.promises.stat(filePath);
      
      const workspaceFile: WorkspaceFile = {
        path: relativePath,
        name: path.basename(filePath),
        language,
        size: stats.size,
        lastModified: stats.mtime
      };

      if (this.isCodeFile(ext)) {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        workspaceFile.content = content;
        
        if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
          workspaceFile.functions = this.parseJavaScriptFunctions(content);
          workspaceFile.classes = this.parseJavaScriptClasses(content);
        }
      }
      
      this.context.workspaceFiles.push(workspaceFile);
      this.context.projectStructure.files.push(relativePath);
    } catch (error) {
      console.error(`Error adding file ${filePath}:`, error);
    }
  }

  private removeFileFromContext(filePath: string): void {
    const relativePath = path.relative(this.context.projectStructure.root, filePath);
    
    this.context.workspaceFiles = this.context.workspaceFiles.filter(f => f.path !== relativePath);
    this.context.projectStructure.files = this.context.projectStructure.files.filter(f => f !== relativePath);
  }

  private addTerminalOutput(data: string): void {
    this.terminalOutput.push(data);
    
    if (this.terminalOutput.length > 1000) {
      this.terminalOutput = this.terminalOutput.slice(-1000);
    }
    
    this.context.terminalOutput = [...this.terminalOutput];
    this.parseTerminalErrors(data);
  }

  private parseTerminalErrors(data: string): void {
    const errorPatterns = [
      /(.*\.ts|.*\.js|.*\.tsx|.*\.jsx):(\d+):(\d+)\s*-\s*error\s+(.*)/gi,
      /File\s+"([^"]+)",\s+line\s+(\d+),\s+in\s+(.*)/gi,
      /error\s+in\s+(.*\.\w+):(\d+):(\d+)/gi,
      /Error:\s+(.*)/gi
    ];

    errorPatterns.forEach(pattern => {
      const matches = data.matchAll(pattern);
      for (const match of matches) {
        const errorContext: ErrorContext = {
          message: match[0],
          file: match[1],
          line: match[2] ? parseInt(match[2]) : undefined,
          column: match[3] ? parseInt(match[3]) : undefined,
          timestamp: new Date(),
          resolved: false
        };
        
        this.context.recentErrors.push(errorContext);
      }
    });
  }

  updateCurrentFile(editor: vscode.TextEditor): void {
    const document = editor.document;
    const relativePath = path.relative(this.context.projectStructure.root, document.fileName);
    
    this.context.currentFile = {
      path: relativePath,
      content: document.getText(),
      language: document.languageId,
      cursorPosition: editor.selection.active,
      selection: editor.selection
    };
  }

  getContext(): CodeContext {
    return { ...this.context };
  }

  getCurrentFile(): CodeContext['currentFile'] {
    return this.context.currentFile;
  }

  getWorkspaceFiles(): WorkspaceFile[] {
    return [...this.context.workspaceFiles];
  }

  getRecentErrors(): ErrorContext[] {
    return [...this.context.recentErrors];
  }

  getTerminalOutput(): string[] {
    return this.terminalOutput;
  }

  getWorkspaceContext(): string {
    const context = this.getContext();
    let workspaceContext = '';
    
    // Add project structure info
    workspaceContext += `Project Root: ${context.projectStructure.root}\n`;
    workspaceContext += `Total Files: ${context.projectStructure.files.length}\n`;
    workspaceContext += `Main Entry Points: ${context.projectStructure.mainEntryPoints.join(', ')}\n`;
    workspaceContext += `Config Files: ${context.projectStructure.configFiles.join(', ')}\n`;
    
    // Add dependency info
    workspaceContext += `Package Manager: ${context.dependencies.packageManager}\n`;
    workspaceContext += `Dependencies: ${Object.keys(context.dependencies.dependencies).length}\n`;
    
    // Add recent errors
    if (context.recentErrors.length > 0) {
      workspaceContext += `Recent Errors: ${context.recentErrors.length}\n`;
    }
    
    return workspaceContext;
  }

  getRecentFiles(count: number = 5): string[] {
    const workspaceFiles = this.getWorkspaceFiles();
    return workspaceFiles
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, count)
      .map(file => file.path);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
} 