# Spilot - AI Coding Agent for IDEs

Spilot is a powerful, context-aware AI coding assistant that transforms your VS Code experience into an intelligent development environment. Think of it as your own personal Cursor + GitHub Copilot + Debugging Assistant, all rolled into one seamless extension.

## 🚀 Features

### 🤖 **Intelligent Context Awareness**
- **Full Codebase Analysis**: Automatically scans and understands your entire project structure
- **Real-time File Tracking**: Knows which file you're working on and your cursor position
- **Function & Class Detection**: Parses and indexes all functions, classes, and dependencies
- **Project Structure Mapping**: Understands your project architecture and relationships

### 🔍 **Advanced Error Analysis & Debugging**
- **Smart Error Parsing**: Automatically detects and analyzes errors from terminal output
- **Contextual Error Solutions**: Provides specific fixes based on your codebase context
- **Multi-language Support**: Handles TypeScript, JavaScript, Python, Java, C++, Go, Rust, and more
- **Error Classification**: Categorizes errors by type (compilation, runtime, syntax, import, dependency)
- **Confidence Scoring**: Shows how confident the AI is in its error analysis

### 💡 **Intelligent Code Assistance**
- **Context-Aware Suggestions**: Code suggestions that understand your project structure
- **Smart Refactoring**: Refactor code with full awareness of dependencies and patterns
- **Intelligent Completion**: Complete code with understanding of your codebase context
- **Code Explanation**: Get detailed explanations of any code with project context

### 🛠️ **Enhanced Development Tools**
- **File Analysis**: Deep analysis of current file with quality assessment
- **Project Insights**: Get architectural recommendations and best practices
- **Dependency Management**: Understand and manage project dependencies
- **Terminal Integration**: Execute suggested commands directly in terminal

## 📋 Commands

### Core Commands
- **Spilot: Show Chat** - Open the AI chat interface
- **Spilot: Set API Key** - Configure your Groq API key
- **Spilot: Suggest Code Improvements** - Get intelligent code suggestions
- **Spilot: Refactor Code** - Refactor selected code with context awareness
- **Spilot: Complete Code** - Complete code at cursor position
- **Spilot: Explain Code** - Get detailed code explanations
- **Spilot: Explain Error** - Analyze and fix errors intelligently
- **Spilot: Analyze Code** - Deep analysis of current file and codebase

## 🎯 How It Works

### 1. **Context Collection**
Spilot automatically:
- Scans your entire workspace
- Indexes all files and their relationships
- Tracks your current file and cursor position
- Monitors terminal output for errors
- Analyzes project dependencies

### 2. **Intelligent Processing**
When you ask a question or request assistance:
- Analyzes your query type (error, explanation, refactor, etc.)
- Gathers relevant context from your codebase
- Builds comprehensive prompts with full project context
- Generates intelligent, context-aware responses

### 3. **Smart Error Handling**
For errors, Spilot:
- Parses error messages from terminal output
- Identifies the specific file and line causing issues
- Analyzes error type and severity
- Provides targeted solutions with explanations
- Suggests related files that might be affected

## 🔧 Installation

1. **Install the Extension**
   ```bash
   # Download from VS Code marketplace or build from source
   ```

2. **Set Up API Key**
   - Get your API key from [Groq](https://console.groq.com/)
   - Run `Spilot: Set API Key` command
   - Enter your API key when prompted

3. **Start Coding**
   - Open any file in your project
   - Use the commands or chat interface
   - Enjoy intelligent, context-aware assistance!

## 💬 Usage Examples

### Error Analysis
```
User: "I'm getting a TypeScript error about missing types"
Spilot: Analyzes the error, identifies the specific file and line, 
       provides the exact fix with explanation, and suggests 
       related files that might need attention.
```

### Code Explanation
```
User: "What does this function do?"
Spilot: Explains the function with full context of your codebase, 
       shows how it relates to other parts of your project, 
       and suggests improvements if applicable.
```

### Smart Refactoring
```
User: "Refactor this code to be more maintainable"
Spilot: Analyzes the current code, understands the project patterns, 
       provides refactored version with explanations, and 
       suggests additional improvements.
```

### File Analysis
```
User: "Analyze this file"
Spilot: Provides comprehensive analysis including:
       - Code quality assessment
       - Potential improvements
       - Best practices recommendations
       - Related files and dependencies
```

## 🏗️ Architecture

### Core Components
- **ContextManager**: Handles codebase analysis and file tracking
- **ErrorAnalyzer**: Intelligent error parsing and solution generation
- **AICodingAgent**: Main agent that orchestrates all interactions
- **SpilotSidebarProvider**: VS Code integration and UI

### Technology Stack
- **Frontend**: VS Code Extension (TypeScript)
- **AI Backend**: Groq Cloud API (Direct integration)
- **Context Analysis**: Custom AST parsing and file indexing
- **Error Detection**: Regex-based pattern matching with ML classification

### Architecture Benefits
- **No Local Server**: Direct API calls to Groq Cloud for better performance
- **Scalable**: Leverages Groq's cloud infrastructure
- **Reliable**: No local server maintenance required
- **Fast**: Optimized timeouts and model selection for different use cases

## 🎨 Advanced Features

### Context-Aware Prompts
Spilot builds intelligent prompts that include:
- Current file content and cursor position
- Project structure and dependencies
- Recent errors and their context
- Related files and functions
- Code patterns and conventions

### Error Intelligence
- **Automatic Detection**: Scans terminal output for errors
- **Smart Classification**: Categorizes errors by type and severity
- **Contextual Solutions**: Provides fixes based on your specific codebase
- **Related File Analysis**: Identifies files that might be affected

### Code Quality Insights
- **Function Analysis**: Detects and analyzes all functions in your codebase
- **Class Structure**: Understands class hierarchies and relationships
- **Dependency Mapping**: Tracks imports and dependencies
- **Pattern Recognition**: Identifies common patterns and anti-patterns

## 🔮 Future Enhancements

- **Real-time Collaboration**: Share context with team members
- **Custom Model Support**: Use your own fine-tuned models
- **Advanced RAG**: Enhanced retrieval-augmented generation
- **Performance Analytics**: Track coding efficiency and improvements
- **Integration APIs**: Connect with other development tools

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [VS Code Extension API](https://code.visualstudio.com/api)
- Powered by [Groq API](https://console.groq.com/)
- Inspired by Cursor, GitHub Copilot, and modern AI coding assistants

---

**Transform your VS Code into an intelligent coding environment with Spilot!** 🚀
