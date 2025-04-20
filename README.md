# Error Explainer

A VS Code extension that helps you understand error messages using AI-powered explanations.

## Features

- Select any error message and get an AI-powered explanation
- Right-click context menu integration
- Powered by Groq AI
- Simple and intuitive interface

## Requirements

- VS Code 1.99.0 or higher
- A Groq API key

## Installation

1. Download the .vsix file
2. In VS Code, go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu at the top of the Extensions view
4. Select "Install from VSIX..."
5. Choose the downloaded .vsix file

## Usage

1. Open any file with an error message
2. Select the error message text
3. Right-click and select "Explain Error"
4. View the AI-generated explanation

## Configuration

1. Create a `.env` file in your workspace
2. Add your Groq API key:
   ```
   API_KEY=your_groq_api_key_here
   ```

## Extension Settings

This extension contributes the following commands:

* `extension.explainError`: Explain the selected error message

## Known Issues

- None at the moment

## Release Notes

### 0.0.1

Initial release of Error Explainer

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This extension is licensed under the MIT License.

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
