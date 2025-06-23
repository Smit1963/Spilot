import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';
import { AICodingAgent } from './ai-coding-agent';

// Network connectivity check utility
async function checkNetworkConnectivity(): Promise<{isConnected: boolean, canReachGroq: boolean, error?: string}> {
  try {
    // First check basic internet connectivity
    const internetResponse = await fetch('https://www.google.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(15000) // Increased to 15 seconds
    });
    
    if (!internetResponse.ok) {
      return { isConnected: false, canReachGroq: false, error: 'No internet connection detected' };
    }

    // Then check Groq API connectivity
    const groqResponse = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      signal: AbortSignal.timeout(20000) // Increased to 20 seconds
    });

    if (!groqResponse.ok) {
      return { isConnected: true, canReachGroq: false, error: `Groq API returned ${groqResponse.status}` };
    }

    return { isConnected: true, canReachGroq: true };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { isConnected: false, canReachGroq: false, error: 'Request timed out' };
    }
    return { isConnected: false, canReachGroq: false, error: error.message };
  }
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('✅ Spilot Extension is now active!');

  // Get API key from settings or environment
  let apiKey = process.env.API_KEY || context.globalState.get<string>('apiKey');
  
  // Initialize AI Coding Agent
  let aiAgent: AICodingAgent | undefined;
  
  // Helper function to ensure API key exists
  const ensureApiKey = async (): Promise<string> => {
    if (!apiKey) {
      const input = await vscode.window.showInputBox({
        prompt: 'Enter your API key to continue',
        password: true
      });
      
      if (!input) {
        throw new Error('API key is required to use this feature');
      }
      
      apiKey = input;
      await context.globalState.update('apiKey', apiKey);
    }
    return apiKey;
  };

  // Initialize AI Agent
  const initializeAIAgent = async (): Promise<AICodingAgent> => {
    if (!aiAgent) {
      const key = await ensureApiKey();
      
      // Check network connectivity before initializing (with fallback)
      console.log('🔍 Checking network connectivity...');
      try {
        const connectivity = await checkNetworkConnectivity();
        
        if (!connectivity.isConnected) {
          console.warn(`⚠️ Network connectivity issue: ${connectivity.error}`);
          console.log('🔄 Proceeding anyway - will test during first API call...');
        }
        
        if (!connectivity.canReachGroq) {
          console.warn(`⚠️ Cannot reach Groq API: ${connectivity.error}`);
          console.log('🔄 Proceeding anyway - will test during first API call...');
        }
        
        if (connectivity.isConnected && connectivity.canReachGroq) {
          console.log('✅ Network connectivity confirmed');
        }
      } catch (error) {
        console.warn('⚠️ Connectivity check failed, proceeding anyway:', error);
      }
      
      aiAgent = new AICodingAgent(key);
      await aiAgent.initialize();
    }
    return aiAgent;
  };

  // Register command to set API key
  let setApiKeyCommand = vscode.commands.registerCommand('extension.setGroqApiKey', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your Groq API key (starts with gsk_)',
      password: true,
      placeHolder: 'gsk_your_api_key_here'
    });

    if (input) {
      // Validate the API key format
      if (!input.startsWith('gsk_')) {
        vscode.window.showErrorMessage('❌ Invalid API key format. API key should start with "gsk_"');
        return;
      }

      try {
        vscode.window.showInformationMessage('🔍 Validating API key...');
        
        // Test the API key by making a request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('https://api.groq.com/openai/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${input}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          vscode.window.showErrorMessage('❌ Invalid API key. Please check your key and try again.');
          return;
        }
        
        if (response.status === 403) {
          vscode.window.showErrorMessage('❌ API key does not have required permissions.');
          return;
        }
        
        if (!response.ok) {
          vscode.window.showErrorMessage(`❌ API error: ${response.status}`);
          return;
        }

        // API key is valid, save it
      apiKey = input;
      await context.globalState.update('apiKey', apiKey);
        
        // Reinitialize AI agent with new key
        aiAgent = undefined;
        
        vscode.window.showInformationMessage('✅ API key validated and saved successfully!');
        
        // Test connectivity
        const connectivity = await checkNetworkConnectivity();
        if (connectivity.isConnected && connectivity.canReachGroq) {
          vscode.window.showInformationMessage('✅ Network connectivity confirmed. Spilot is ready to use!');
        }
        
      } catch (error: any) {
        if (error.name === 'AbortError') {
          vscode.window.showErrorMessage('❌ Request timed out. Please check your internet connection.');
        } else {
          vscode.window.showErrorMessage(`❌ Error validating API key: ${error.message}`);
        }
      }
    }
  });

  // Register command to test network connectivity
  let testConnectivityCommand = vscode.commands.registerCommand('extension.testConnectivity', async () => {
    try {
      vscode.window.showInformationMessage('Testing network connectivity...');
      
      const connectivity = await checkNetworkConnectivity();
      
      if (connectivity.isConnected && connectivity.canReachGroq) {
        vscode.window.showInformationMessage('✅ Network connectivity: OK\n✅ Groq API: Accessible');
      } else {
        vscode.window.showErrorMessage(`❌ Network issue: ${connectivity.error}`);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`❌ Connectivity test failed: ${error.message}`);
    }
  });

  // Register enhanced code suggestion command
  let suggestCodeCommand = vscode.commands.registerCommand('extension.suggestCode', async () => {
    try {
      const agent = await initializeAIAgent();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      
      if (!text) {
        vscode.window.showInformationMessage('Please select code to get suggestions');
        return;
      }

      const response = await agent.processUserQuery(`Suggest improvements for this code: ${text}`, editor);
      
      if (response.content) {
        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: editor.document.languageId
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error getting suggestions: ${error.message}`);
    }
  });

  // Register enhanced code refactor command
  let refactorCodeCommand = vscode.commands.registerCommand('extension.refactorCode', async () => {
    try {
      const agent = await initializeAIAgent();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      
      if (!text) {
        vscode.window.showInformationMessage('Please select code to refactor');
        return;
      }

      const response = await agent.processUserQuery(`Refactor this code: ${text}`, editor);
      
      if (response.codeBlocks.length > 0) {
        const refactoredCode = response.codeBlocks[0].content;
        await editor.edit(editBuilder => {
          editBuilder.replace(selection, refactoredCode);
        });
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error refactoring code: ${error.message}`);
    }
  });

  // Register enhanced code completion command
  let completeCodeCommand = vscode.commands.registerCommand('extension.completeCode', async () => {
    try {
      const agent = await initializeAIAgent();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const position = editor.selection.active;
      const linePrefix = editor.document.lineAt(position.line).text.substr(0, position.character);
      
      const response = await agent.processUserQuery(`Complete this code: ${linePrefix}`, editor);
      
      if (response.codeBlocks.length > 0) {
        const completion = response.codeBlocks[0].content;
        await editor.edit(editBuilder => {
          editBuilder.insert(position, completion);
        });
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error completing code: ${error.message}`);
    }
  });

  // Register enhanced explain code command
  let explainCodeCommand = vscode.commands.registerCommand('extension.explainCode', async () => {
    try {
      const agent = await initializeAIAgent();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      
      if (!text) {
        vscode.window.showInformationMessage('Please select code to explain');
        return;
      }

      const response = await agent.processUserQuery(`Explain this code: ${text}`, editor);
      
      if (response.content) {
        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error explaining code: ${error.message}`);
    }
  });

  // Register enhanced explain error command
  let explainErrorCommand = vscode.commands.registerCommand('extension.explainError', async () => {
    try {
      const agent = await initializeAIAgent();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      
      if (!text) {
        vscode.window.showInformationMessage('Please select the error message to explain');
        return;
      }

      const response = await agent.processUserQuery(`Explain and fix this error: ${text}`, editor);
      
      if (response.content) {
        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error explaining error: ${error.message}`);
    }
  });

  // Register new context-aware analysis command
  let analyzeCodeCommand = vscode.commands.registerCommand('extension.analyzeCode', async () => {
    try {
      const agent = await initializeAIAgent();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const response = await agent.processUserQuery('Analyze this file and provide insights about code quality, potential improvements, and best practices', editor);
      
      if (response.content) {
        const doc = await vscode.workspace.openTextDocument({
          content: response.content,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error analyzing code: ${error.message}`);
    }
  });

  // Register Spilot Chat webview command
  let showChatCommand = vscode.commands.registerCommand('spilot.showChat', () => {
    vscode.commands.executeCommand('spilotAssistant.focus');
  });

  // Register the sidebar provider for the spilotAssistant view
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SpilotSidebarProvider.viewType,
      new SpilotSidebarProvider(context, ensureApiKey, initializeAIAgent)
    )
  );

  context.subscriptions.push(
    setApiKeyCommand, 
    testConnectivityCommand,
    suggestCodeCommand, 
    refactorCodeCommand, 
    completeCodeCommand, 
    explainCodeCommand, 
    explainErrorCommand, 
    analyzeCodeCommand,
    showChatCommand
  );
}

// Fetches a response from Groq API directly (legacy function for backward compatibility)
async function fetchLLMResponse(action: 'suggest' | 'refactor' | 'complete' | 'explain' | 'error', code: string, apiKey: string, model?: string): Promise<string> {
  try {
    const llmModel = model || 'llama-3.1-8b-instant';
    
    let systemPrompt = '';
    let userPrompt = '';
    
    switch (action) {
      case 'suggest':
        systemPrompt = 'You are an expert code reviewer. Provide suggestions to improve the following code.';
        userPrompt = `Please suggest improvements for this code:\n\n${code}`;
        break;
      case 'refactor':
        systemPrompt = 'You are an expert software engineer. Refactor the following code to improve it.';
        userPrompt = `Please refactor this code:\n\n${code}`;
        break;
      case 'complete':
        systemPrompt = 'You are an expert programmer. Complete the following code snippet.';
        userPrompt = `Please complete this code:\n\n${code}`;
        break;
      case 'explain':
        systemPrompt = 'You are an expert programming instructor. Explain the following code.';
        userPrompt = `Please explain this code:\n\n${code}`;
        break;
      case 'error':
        systemPrompt = 'You are an expert debugging assistant. Analyze this error and provide a solution.';
        userPrompt = `Please explain this error and how to fix it:\n\n${code}`;
        break;
    }

    // Create AbortController with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Legacy request timeout reached, aborting...');
      controller.abort();
    }, 30000); // 30 second timeout

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: llmModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      signal: controller.signal
    });

    // Clear timeout since request completed
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Groq API error: ${errorData.error?.message || `HTTP ${response.status}`}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw new Error(`Failed to fetch from Groq API: ${error.message}`);
  }
}

function getWebviewHtml(scriptUri: vscode.Uri, cspSource: string) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Spilot Chat</title>
        <style>
          body { margin: 0; padding: 0; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
          #root { height: 100vh; width: 100vw; }
        </style>
    </head>
    <body>
        <div id="root"></div>
        <script src="${scriptUri}"></script>
    </body>
    </html>`;
}

function getCodeBlocks(response: string): { lang: string; content: string }[] {
  const regex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: { lang: string; content: string }[] = [];
  let match;
  while ((match = regex.exec(response)) !== null) {
    blocks.push({
      lang: match[1] || "plaintext",
      content: match[2].trim(),
    });
  }
  return blocks;
}

class SpilotSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'spilotAssistant';

  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _ensureApiKey: () => Promise<string>;
  private _initializeAIAgent: () => Promise<AICodingAgent>;

  constructor(
    context: vscode.ExtensionContext, 
    ensureApiKey: () => Promise<string>,
    initializeAIAgent: () => Promise<AICodingAgent>
  ) {
    this._context = context;
    this._ensureApiKey = ensureApiKey;
    this._initializeAIAgent = initializeAIAgent;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(this._context.extensionPath, 'dist'))],
    };
    const scriptUri = webviewView.webview.asWebviewUri(
      vscode.Uri.file(path.join(this._context.extensionPath, 'dist', 'webview.js'))
    );
    webviewView.webview.html = getWebviewHtml(scriptUri, webviewView.webview.cspSource);

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'chat': {
            const { text, files, agentMode, model, conversationId } = message;
            if (agentMode === 'manual') {
              const fileNames = files.map((f: any) => f.name).join(', ');
              webviewView.webview.postMessage({ 
                type: 'chatResponse', 
                text: '[Manual Entry] ' + text + (files.length > 0 ? `\n[Files: ${fileNames}]` : ''), 
                conversationId 
              });
              return;
            }
            try {
              const agent = await this._initializeAIAgent();
              const editor = vscode.window.activeTextEditor;

              if (model) {
                agent.setModel(model);
              }

              let queryText = text;
              if (files && files.length > 0) {
                let fileContext = '\n\n--- File Context ---\n';
                for (const file of files) {
                  fileContext += `\n[File: ${file.name}]\n\`\`\`\n${file.content}\n\`\`\`\n`;
                }
                queryText += fileContext;
              }

              const response = await agent.processUserQuery(queryText, editor);
              
              webviewView.webview.postMessage({ 
                type: 'chatResponse', 
                text: response.content, 
                conversationId,
                confidence: response.confidence,
                explanation: response.explanation
              });

              // Handle code blocks and terminal commands
              const codeBlocks = response.codeBlocks;
              const shellCommands = codeBlocks
                .filter(block => ['bash', 'sh', 'shell', 'terminal'].includes(block.language.toLowerCase()))
                .map(block => block.content);

              if (shellCommands.length > 0) {
                let terminal = vscode.window.terminals.find(t => t.name === 'Spilot Terminal');
                if (!terminal) {
                  terminal = vscode.window.createTerminal('Spilot Terminal');
                }
                terminal.show();

                for (const command of shellCommands) {
                  terminal.sendText(command);
                }
              }
            } catch (error: any) {
              vscode.window.showErrorMessage(`Error getting AI response: ${error.message}`);
              webviewView.webview.postMessage({ type: 'error', text: error.message });
            }
            return;
          }
        }
      },
      undefined,
      this._context.subscriptions
    );
  }
}

// This function is called when your extension is deactivated
export function deactivate() {}
