import * as vscode from 'vscode';
import * as path from 'path';
const fetch = require('node-fetch');

export async function activate(context: vscode.ExtensionContext) {
  console.log('✅ Error Explainer Extension is now active!');

  // Get API key from settings or environment
  let apiKey = process.env.API_KEY;
  
  // Register command to set API key first
  let setApiKeyCommand = vscode.commands.registerCommand('extension.setGroqApiKey', async () => {
    // Create a new webview panel
    const panel = vscode.window.createWebviewPanel(
      'setApiKey',
      'Set Groq API Key',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true // This keeps the panel state when switching tabs
      }
    );

    // Get the current API key if it exists
    const currentApiKey = context.globalState.get<string>('groqApiKey') || '';

    // Set the HTML content
    panel.webview.html = getWebviewContent(currentApiKey);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'saveApiKey':
            if (message.apiKey) {
              apiKey = message.apiKey;
              context.globalState.update('groqApiKey', apiKey);
              vscode.window.showInformationMessage('API key has been saved.');
              panel.dispose();
            }
            break;
          case 'cancel':
            panel.dispose();
            break;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  // Add the command to subscriptions immediately
  context.subscriptions.push(setApiKeyCommand);
  
  // Create a status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(key) Set Groq API Key";
  statusBarItem.command = 'extension.setGroqApiKey';
  statusBarItem.tooltip = "Set your Groq API key";
  statusBarItem.show();
  
  // If no API key, prompt user to enter it
  if (!apiKey) {
    try {
      // Try to get API key from global state
      apiKey = context.globalState.get<string>('groqApiKey');
      
      if (!apiKey) {
        // If still no API key, show the webview panel
        vscode.commands.executeCommand('extension.setGroqApiKey');
      }
    } catch (error) {
      console.error('Error checking for API key:', error);
      vscode.window.showErrorMessage('Error checking for API key. Please try setting it again.');
    }
  }

  // Helper function to get webview content
  function getWebviewContent(currentApiKey: string) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                padding: 20px;
                font-family: var(--vscode-font-family);
                color: var(--vscode-editor-foreground);
                background-color: var(--vscode-editor-background);
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
            }
            .input-group {
                margin-bottom: 20px;
            }
            input {
                width: 100%;
                padding: 8px;
                margin: 8px 0;
                background-color: var(--vscode-input-background);
                color: var(--vscode-input-foreground);
                border: 1px solid var(--vscode-input-border);
            }
            .button-group {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            button {
                padding: 8px 16px;
                border: none;
                cursor: pointer;
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
            button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            .cancel-button {
                background-color: var(--vscode-button-secondaryBackground);
            }
            .cancel-button:hover {
                background-color: var(--vscode-button-secondaryHoverBackground);
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="input-group">
                <label for="apiKey">Enter your Groq API key:</label>
                <input type="password" id="apiKey" value="${currentApiKey}" placeholder="gsk_xxxxxxxx">
            </div>
            <div class="button-group">
                <button class="cancel-button" onclick="cancel()">Cancel</button>
                <button onclick="saveApiKey()">Save</button>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            
            function saveApiKey() {
                const apiKey = document.getElementById('apiKey').value;
                vscode.postMessage({
                    command: 'saveApiKey',
                    apiKey: apiKey
                });
            }
            
            function cancel() {
                vscode.postMessage({
                    command: 'cancel'
                });
            }
        </script>
    </body>
    </html>`;
  }

  // Register the explain error command
  let disposable = vscode.commands.registerCommand('extension.explainError', async () => {
    // Get API key from global state if not in environment
    const storedApiKey = context.globalState.get<string>('groqApiKey') || '';
    const currentApiKey = apiKey || storedApiKey;

    if (!currentApiKey) {
      vscode.window.showErrorMessage('API key not found. Please run the "Error Explainer: Set API Key" command.');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor detected.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText.trim()) {
      vscode.window.showInformationMessage('Please select an error message to explain.');
      return;
    }

    try {
      const explanation = await fetchExplanation(selectedText, currentApiKey);
      
      if (explanation) {
        vscode.window.showInformationMessage(explanation);
      } else {
        vscode.window.showErrorMessage('No explanation received from Groq API.');
      }

    } catch (error: any) {
      console.error('Error fetching explanation:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      vscode.window.showErrorMessage(`Failed to fetch explanation: ${errorMessage}`);
    }
  });

  // Register command to set API key in .env file
  let setEnvApiKeyCommand = vscode.commands.registerCommand('extension.setEnvApiKey', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your Groq API key to save in .env file',
      placeHolder: 'gsk_xxxxxxxx',
      password: true
    });

    if (input) {
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(context.extensionPath, '.env');
        
        // Read the current .env file
        let envContent = '';
        try {
          envContent = fs.readFileSync(envPath, 'utf8');
        } catch (err) {
          // File doesn't exist or can't be read, create default content
          envContent = '# Groq API Key\nAPI_KEY=\n';
        }
        
        // Update the API key in the content
        if (envContent.includes('API_KEY=')) {
          envContent = envContent.replace(/API_KEY=.*/, `API_KEY=${input}`);
        } else {
          envContent += `\nAPI_KEY=${input}\n`;
        }
        
        // Write the updated content back to the file
        fs.writeFileSync(envPath, envContent);
        
        // Update the in-memory API key
        apiKey = input;
        context.globalState.update('groqApiKey', apiKey);
        
        vscode.window.showInformationMessage('API key has been saved to .env file.');
      } catch (error: any) {
        console.error('Error saving API key to .env file:', error);
        vscode.window.showErrorMessage(`Failed to save API key to .env file: ${error.message}`);
      }
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(setEnvApiKeyCommand);
}

export async function deactivate() {}

async function fetchExplanation(errorMessage: string, apiKey: string): Promise<string | undefined> {
  if (!apiKey) {
    throw new Error('API key not found. Please use the "Error Explainer: Set API Key" command to set your API key.');
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const body = JSON.stringify({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "You are a helpful programming assistant that explains error messages clearly and concisely."
      },
      {
        role: "user",
        content: `Please explain this error message in simple terms: ${errorMessage}`
      }
    ],
    temperature: 0.3,
    max_tokens: 500,
    stream: false
  });

  try {
    console.log('🌐 Sending request to Groq API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: body
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API error:', errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}. Details: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Received response from Groq:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Unexpected API response structure:', data);
      throw new Error('Invalid response format from API');
    }

    return data.choices[0].message.content;
  } catch (error: any) {
    console.error('❌ Error in fetchExplanation:', error);
    throw error;
  }
}
