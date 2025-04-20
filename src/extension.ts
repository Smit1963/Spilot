import * as vscode from 'vscode';
import * as path from 'path';
import fetch from 'node-fetch';

export async function activate(context: vscode.ExtensionContext) {
  console.log('✅ Spilot Extension is now active!');

  // Get API key from settings or environment
  let apiKey = process.env.API_KEY || context.globalState.get<string>('apiKey');
  
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

  // Register command to set API key
  let setApiKeyCommand = vscode.commands.registerCommand('extension.setGroqApiKey', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your API key',
      password: true
    });

    if (input) {
      apiKey = input;
      await context.globalState.update('apiKey', apiKey);
      vscode.window.showInformationMessage('API key has been saved.');
    }
  });

  // Register code suggestion command
  let suggestCodeCommand = vscode.commands.registerCommand('extension.suggestCode', async () => {
    try {
      const key = await ensureApiKey();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const text = editor.document.getText(selection);
      const originalText = text;
      
      if (!text) {
        vscode.window.showInformationMessage('Please select code to get suggestions');
        return;
      }

      const suggestion = await fetchLLMResponse('suggest', text, key);
      if (suggestion) {
        const doc = await vscode.workspace.openTextDocument({
          content: suggestion,
          language: editor.document.languageId
        });
        const suggestionDoc = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

        // Show accept/reject buttons
        const choice = await vscode.window.showInformationMessage(
          'Would you like to apply these suggestions?',
          'Accept',
          'Reject'
        );

        if (choice === 'Accept') {
          await editor.edit(editBuilder => {
            editBuilder.replace(selection, suggestion);
          });
          await suggestionDoc.hide();
        } else if (choice === 'Reject') {
          await suggestionDoc.hide();
        }
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error getting suggestions: ${error.message}`);
    }
  });

  // Register code refactor command
  let refactorCodeCommand = vscode.commands.registerCommand('extension.refactorCode', async () => {
    try {
      const key = await ensureApiKey();
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

      const refactoredCode = await fetchLLMResponse('refactor', text, key);
      if (refactoredCode) {
        // Show refactored code in a new document first
        const doc = await vscode.workspace.openTextDocument({
          content: refactoredCode,
          language: editor.document.languageId
        });
        const refactorDoc = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

        // Show accept/reject buttons
        const choice = await vscode.window.showInformationMessage(
          'Would you like to apply these refactoring changes?',
          'Accept',
          'Reject'
        );

        if (choice === 'Accept') {
          await editor.edit(editBuilder => {
            editBuilder.replace(selection, refactoredCode);
          });
          await refactorDoc.hide();
        } else if (choice === 'Reject') {
          await refactorDoc.hide();
        }
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error refactoring code: ${error.message}`);
    }
  });

  // Register code completion command
  let completeCodeCommand = vscode.commands.registerCommand('extension.completeCode', async () => {
    try {
      const key = await ensureApiKey();
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
      }

      const position = editor.selection.active;
      const linePrefix = editor.document.lineAt(position.line).text.substr(0, position.character);
      
      const completion = await fetchLLMResponse('complete', linePrefix, key);
      if (completion) {
        // Show completion in a new document first
        const doc = await vscode.workspace.openTextDocument({
          content: `${linePrefix}${completion}`,
          language: editor.document.languageId
        });
        const completionDoc = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);

        // Show accept/reject buttons
        const choice = await vscode.window.showInformationMessage(
          'Would you like to apply this completion?',
          'Accept',
          'Reject'
        );

        if (choice === 'Accept') {
          await editor.edit(editBuilder => {
            editBuilder.insert(position, completion);
          });
          await completionDoc.hide();
        } else if (choice === 'Reject') {
          await completionDoc.hide();
        }
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error completing code: ${error.message}`);
    }
  });

  // Register explain code command
  let explainCodeCommand = vscode.commands.registerCommand('extension.explainCode', async () => {
    try {
      const key = await ensureApiKey();
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

      const explanation = await fetchLLMResponse('explain', text, key);
      if (explanation) {
        const doc = await vscode.workspace.openTextDocument({
          content: explanation,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error explaining code: ${error.message}`);
    }
  });

  // Register explain error command
  let explainErrorCommand = vscode.commands.registerCommand('extension.explainError', async () => {
    try {
      const key = await ensureApiKey();
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

      const explanation = await fetchLLMResponse('error', text, key);
      if (explanation) {
        const doc = await vscode.workspace.openTextDocument({
          content: explanation,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      }
    } catch (error: any) {
      vscode.window.showErrorMessage(`Error explaining error: ${error.message}`);
    }
  });

  // Helper function to fetch responses from LLM
  async function fetchLLMResponse(action: 'suggest' | 'refactor' | 'complete' | 'explain' | 'error', code: string, apiKey: string): Promise<string> {
    if (!apiKey) {
      throw new Error('API key not found. Please set your API key first.');
    }

    const prompts = {
      suggest: `Suggest improvements or alternatives for this code:\n${code}`,
      refactor: `Refactor this code to improve its quality, maintainability, and performance:\n${code}`,
      complete: `Complete this code snippet:\n${code}`,
      explain: `Explain this code in detail:\n${code}`,
      error: `Explain this error message in detail and suggest possible solutions:\n${code}`
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert programming assistant."
          },
          {
            role: "user",
            content: prompts[action]
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Register all commands
  context.subscriptions.push(
    setApiKeyCommand,
    suggestCodeCommand,
    refactorCodeCommand,
    completeCodeCommand,
    explainCodeCommand,
    explainErrorCommand
  );
}

export function deactivate() {}
