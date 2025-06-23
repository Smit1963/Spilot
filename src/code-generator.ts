import * as vscode from 'vscode';
import { ParsedFile } from './ast-parser';

export interface CodeGenerationRequest {
  type: 'function' | 'class' | 'component' | 'test' | 'interface' | 'utility';
  name: string;
  description: string;
  parameters?: string[];
  returnType?: string;
  language: string;
  framework?: string;
  patterns?: string[];
  requirements?: string[];
}

export interface GeneratedCode {
  code: string;
  language: string;
  imports: string[];
  dependencies: string[];
  documentation: string;
  tests?: string;
}

export class CodeGenerator {
  private templates: Map<string, string> = new Map();
  private patterns: Map<string, string> = new Map();

  constructor() {
    this.initializeTemplates();
    this.initializePatterns();
  }

  private initializeTemplates() {
    // Function templates
    this.templates.set('function', `
/**
 * {{description}}
 * @param {{parameters}}
 * @returns {{returnType}}
 */
export function {{name}}({{parameters}}): {{returnType}} {
  {{body}}
}
`);

    // Class templates
    this.templates.set('class', `
/**
 * {{description}}
 */
export class {{name}} {
  {{properties}}

  constructor({{constructorParams}}) {
    {{constructorBody}}
  }

  {{methods}}
}
`);

    // React component template
    this.templates.set('react-component', `
import React from 'react';

interface {{name}}Props {
  {{props}}
}

/**
 * {{description}}
 */
export const {{name}}: React.FC<{{name}}Props> = ({ {{propsList}} }) => {
  {{state}}

  {{effects}}

  return (
    {{jsx}}
  );
};
`);

    // Test template
    this.templates.set('test', `
import { describe, it, expect } from 'vitest';
import { {{functionName}} } from './{{fileName}}';

describe('{{functionName}}', () => {
  it('should {{testCase}}', () => {
    {{testBody}}
  });
});
`);
  }

  private initializePatterns() {
    // Common patterns
    this.patterns.set('singleton', `
private static instance: {{className}} | null = null;

public static getInstance(): {{className}} {
  if (!{{className}}.instance) {
    {{className}}.instance = new {{className}}();
  }
  return {{className}}.instance;
}

private constructor() {}
`);

    this.patterns.set('factory', `
public static create{{Type}}(config: {{ConfigType}}): {{Type}} {
  return new {{Type}}(config);
}
`);

    this.patterns.set('observer', `
private listeners: Map<string, Function[]> = new Map();

public subscribe(event: string, callback: Function): void {
  if (!this.listeners.has(event)) {
    this.listeners.set(event, []);
  }
  this.listeners.get(event)!.push(callback);
}

public emit(event: string, data: any): void {
  const callbacks = this.listeners.get(event) || [];
  callbacks.forEach(callback => callback(data));
}
`);
  }

  generateCode(request: CodeGenerationRequest, context?: ParsedFile): GeneratedCode {
    switch (request.type) {
      case 'function':
        return this.generateFunction(request, context);
      case 'class':
        return this.generateClass(request, context);
      case 'component':
        return this.generateComponent(request, context);
      case 'test':
        return this.generateTest(request, context);
      case 'interface':
        return this.generateInterface(request, context);
      case 'utility':
        return this.generateUtility(request, context);
      default:
        throw new Error(`Unsupported code generation type: ${request.type}`);
    }
  }

  private generateFunction(request: CodeGenerationRequest, context?: ParsedFile): GeneratedCode {
    const template = this.templates.get('function') || '';
    const body = this.generateFunctionBody(request, context);
    
    const code = template
      .replace(/{{description}}/g, request.description)
      .replace(/{{name}}/g, request.name)
      .replace(/{{parameters}}/g, this.formatParameters(request.parameters || []))
      .replace(/{{returnType}}/g, request.returnType || 'void')
      .replace(/{{body}}/g, body);

    return {
      code,
      language: request.language,
      imports: this.generateImports(request, context),
      dependencies: [],
      documentation: this.generateDocumentation(request)
    };
  }

  private generateClass(request: CodeGenerationRequest, context?: ParsedFile): GeneratedCode {
    const template = this.templates.get('class') || '';
    const properties = this.generateClassProperties(request);
    const methods = this.generateClassMethods(request);
    const constructorParams = this.generateConstructorParams(request);
    const constructorBody = this.generateConstructorBody(request);
    
    const code = template
      .replace(/{{description}}/g, request.description)
      .replace(/{{name}}/g, request.name)
      .replace(/{{properties}}/g, properties)
      .replace(/{{constructorParams}}/g, constructorParams)
      .replace(/{{constructorBody}}/g, constructorBody)
      .replace(/{{methods}}/g, methods);

    return {
      code,
      language: request.language,
      imports: this.generateImports(request, context),
      dependencies: [],
      documentation: this.generateDocumentation(request)
    };
  }

  private generateComponent(request: CodeGenerationRequest, context?: ParsedFile): GeneratedCode {
    const template = this.templates.get('react-component') || '';
    const props = this.generateComponentProps(request);
    const state = this.generateComponentState(request);
    const effects = this.generateComponentEffects(request);
    const jsx = this.generateComponentJSX(request);
    
    const code = template
      .replace(/{{description}}/g, request.description)
      .replace(/{{name}}/g, request.name)
      .replace(/{{props}}/g, props)
      .replace(/{{propsList}}/g, this.formatPropsList(request))
      .replace(/{{state}}/g, state)
      .replace(/{{effects}}/g, effects)
      .replace(/{{jsx}}/g, jsx);

    return {
      code,
      language: 'tsx',
      imports: ['React'],
      dependencies: ['react'],
      documentation: this.generateDocumentation(request)
    };
  }

  private generateTest(request: CodeGenerationRequest, context?: ParsedFile): GeneratedCode {
    const template = this.templates.get('test') || '';
    const testBody = this.generateTestBody(request);
    
    const code = template
      .replace(/{{functionName}}/g, request.name)
      .replace(/{{fileName}}/g, this.getFileName(request.name))
      .replace(/{{testCase}}/g, request.description.toLowerCase())
      .replace(/{{testBody}}/g, testBody);

    return {
      code,
      language: request.language,
      imports: ['vitest'],
      dependencies: ['vitest'],
      documentation: `Test for ${request.name}`
    };
  }

  private generateInterface(request: CodeGenerationRequest, context?: ParsedFile): GeneratedCode {
    const properties = this.generateInterfaceProperties(request);
    
    const code = `
/**
 * {{description}}
 */
export interface {{name}} {
  {{properties}}
}
`.replace(/{{description}}/g, request.description)
  .replace(/{{name}}/g, request.name)
  .replace(/{{properties}}/g, properties);

    return {
      code,
      language: request.language,
      imports: [],
      dependencies: [],
      documentation: this.generateDocumentation(request)
    };
  }

  private generateUtility(request: CodeGenerationRequest, context?: ParsedFile): GeneratedCode {
    const body = this.generateUtilityBody(request);
    
    const code = `
/**
 * {{description}}
 */
export const {{name}} = ({{parameters}}): {{returnType}} => {
  {{body}}
};
`.replace(/{{description}}/g, request.description)
  .replace(/{{name}}/g, request.name)
  .replace(/{{parameters}}/g, this.formatParameters(request.parameters || []))
  .replace(/{{returnType}}/g, request.returnType || 'any')
  .replace(/{{body}}/g, body);

    return {
      code,
      language: request.language,
      imports: this.generateImports(request, context),
      dependencies: [],
      documentation: this.generateDocumentation(request)
    };
  }

  private generateFunctionBody(request: CodeGenerationRequest, context?: ParsedFile): string {
    if (request.requirements?.includes('validation')) {
      return `
  // Input validation
  if (!${request.parameters?.[0] || 'input'}) {
    throw new Error('Invalid input provided');
  }

  // TODO: Implement ${request.name} logic
  return ${request.returnType === 'void' ? '' : 'result'};
`;
    }

    if (request.requirements?.includes('async')) {
      return `
  try {
    // TODO: Implement async ${request.name} logic
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    throw new Error(\`Failed to ${request.name}: \${error.message}\`);
  }
`;
    }

    return `
  // TODO: Implement ${request.name} logic
  return ${request.returnType === 'void' ? '' : 'result'};
`;
  }

  private generateClassProperties(request: CodeGenerationRequest): string {
    if (request.parameters && request.parameters.length > 0) {
      return request.parameters.map(param => {
        const [name, type] = param.split(':');
        return `private ${name}: ${type || 'any'};`;
      }).join('\n  ');
    }
    return '// Add properties as needed';
  }

  private generateClassMethods(request: CodeGenerationRequest): string {
    if (request.patterns?.includes('singleton')) {
      return this.patterns.get('singleton') || '';
    }

    return `
  // Add methods as needed
  public someMethod(): void {
    // TODO: Implement method logic
  }
`;
  }

  private generateConstructorParams(request: CodeGenerationRequest): string {
    if (request.parameters && request.parameters.length > 0) {
      return request.parameters.join(', ');
    }
    return '';
  }

  private generateConstructorBody(request: CodeGenerationRequest): string {
    if (request.parameters && request.parameters.length > 0) {
      return request.parameters.map(param => {
        const [name] = param.split(':');
        return `this.${name} = ${name};`;
      }).join('\n    ');
    }
    return '// Initialize properties';
  }

  private generateComponentProps(request: CodeGenerationRequest): string {
    if (request.parameters && request.parameters.length > 0) {
      return request.parameters.map(param => {
        const [name, type] = param.split(':');
        return `${name}${type ? `: ${type}` : ': any'}`;
      }).join('\n  ');
    }
    return '// Add props as needed';
  }

  private generateComponentState(request: CodeGenerationRequest): string {
    if (request.requirements?.includes('state')) {
      return `
  const [state, setState] = useState<any>(null);
`;
    }
    return '';
  }

  private generateComponentEffects(request: CodeGenerationRequest): string {
    if (request.requirements?.includes('effects')) {
      return `
  useEffect(() => {
    // TODO: Implement side effects
  }, []);
`;
    }
    return '';
  }

  private generateComponentJSX(request: CodeGenerationRequest): string {
    return `
    <div>
      <h1>${request.name}</h1>
      {/* TODO: Add component content */}
    </div>
  `;
  }

  private generateTestBody(request: CodeGenerationRequest): string {
    return `
    const result = ${request.name}(${this.generateTestInputs(request)});
    expect(result).toBeDefined();
  `;
  }

  private generateInterfaceProperties(request: CodeGenerationRequest): string {
    if (request.parameters && request.parameters.length > 0) {
      return request.parameters.map(param => {
        const [name, type] = param.split(':');
        return `${name}${type ? `: ${type}` : ': any'}`;
      }).join('\n  ');
    }
    return '// Add interface properties';
  }

  private generateUtilityBody(request: CodeGenerationRequest): string {
    return `
  // TODO: Implement utility logic
  return result;
`;
  }

  private generateImports(request: CodeGenerationRequest, context?: ParsedFile): string[] {
    const imports: string[] = [];

    if (request.framework === 'react') {
      imports.push('react');
    }

    if (request.requirements?.includes('async')) {
      imports.push('async/await utilities');
    }

    if (context?.dependencies) {
      imports.push(...context.dependencies);
    }

    return imports;
  }

  private generateDocumentation(request: CodeGenerationRequest): string {
    return `
# ${request.name}

${request.description}

## Parameters
${request.parameters?.map(param => `- \`${param}\``).join('\n') || 'None'}

## Returns
${request.returnType || 'void'}

## Usage
\`\`\`${request.language}
// TODO: Add usage example
\`\`\`
`;
  }

  private formatParameters(parameters: string[]): string {
    return parameters.join(', ');
  }

  private formatPropsList(request: CodeGenerationRequest): string {
    if (request.parameters && request.parameters.length > 0) {
      return request.parameters.map(param => param.split(':')[0]).join(', ');
    }
    return '';
  }

  private generateTestInputs(request: CodeGenerationRequest): string {
    if (request.parameters && request.parameters.length > 0) {
      return request.parameters.map(param => {
        const [name, type] = param.split(':');
        if (type?.includes('string')) return '"test"';
        if (type?.includes('number')) return '1';
        if (type?.includes('boolean')) return 'true';
        return 'null';
      }).join(', ');
    }
    return '';
  }

  private getFileName(functionName: string): string {
    return functionName.charAt(0).toLowerCase() + functionName.slice(1);
  }

  // Advanced code generation methods
  generateFromDescription(description: string, language: string): GeneratedCode {
    const requirements = this.parseRequirements(description);
    const name = this.extractName(description);
    
    const request: CodeGenerationRequest = {
      type: this.determineType(description),
      name,
      description,
      language,
      requirements
    };

    return this.generateCode(request);
  }

  private parseRequirements(description: string): string[] {
    const requirements: string[] = [];
    
    if (description.toLowerCase().includes('async')) requirements.push('async');
    if (description.toLowerCase().includes('validate')) requirements.push('validation');
    if (description.toLowerCase().includes('state')) requirements.push('state');
    if (description.toLowerCase().includes('effect')) requirements.push('effects');
    
    return requirements;
  }

  private extractName(description: string): string {
    const words = description.split(' ');
    const nameIndex = words.findIndex(word => 
      word.toLowerCase().includes('function') || 
      word.toLowerCase().includes('class') ||
      word.toLowerCase().includes('component')
    );
    
    if (nameIndex !== -1 && nameIndex + 1 < words.length) {
      return words[nameIndex + 1];
    }
    
    return 'GeneratedCode';
  }

  private determineType(description: string): 'function' | 'class' | 'component' | 'test' | 'interface' | 'utility' {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('component')) return 'component';
    if (lowerDesc.includes('class')) return 'class';
    if (lowerDesc.includes('test')) return 'test';
    if (lowerDesc.includes('interface')) return 'interface';
    if (lowerDesc.includes('utility')) return 'utility';
    
    return 'function';
  }
} 