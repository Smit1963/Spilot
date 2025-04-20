import * as vscode from 'vscode';
import * as path from 'path';
const fetch = require('node-fetch');

export async function activate(context: vscode.ExtensionContext) {
  console.log('✅ Error Explainer Extension is now active!');

  // Get API key from settings or environment
  let apiKey = process.env.API_KEY;
  
  // Create a status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = "$(key) Set Groq API Key";
  statusBarItem.command = 'extension.setGroqApiKey';
  statusBarItem.tooltip = "Set your Groq API key";
  statusBarItem.show();
  
  // If no API key, prompt user to enter it
  if (!apiKey) {
    const input = await vscode.window.showInputBox({
      prompt: 'Please enter your Groq API key',
      placeHolder: 'gsk_xxxxxxxx',
      password: true
    });

    if (input) {
      apiKey = input;
      // Store the API key in extension's global state
      context.globalState.update('groqApiKey', apiKey);
    } else {
      vscode.window.showErrorMessage('API key is required for the Error Explainer extension to work.');
      return;
    }
  }

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

  // Register command to set API key
  let setApiKeyCommand = vscode.commands.registerCommand('extension.setGroqApiKey', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your Groq API key',
      placeHolder: 'gsk_xxxxxxxx',
      password: true
    });

    if (input) {
      apiKey = input;
      context.globalState.update('groqApiKey', apiKey);
      vscode.window.showInformationMessage('API key has been saved.');
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
  context.subscriptions.push(setApiKeyCommand);
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
