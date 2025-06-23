package llm

import (
	"context"
	"fmt"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// GroqClient wraps the OpenAI client for Groq API
type GroqClient struct {
	client *openai.Client
	model  string
	logger *zap.Logger
}

// NewGroqClient creates a new Groq client
func NewGroqClient(apiKey, model string) (*GroqClient, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("API key is required")
	}

	config := openai.DefaultConfig(apiKey)
	config.BaseURL = "https://api.groq.com/openai/v1"

	client := openai.NewClientWithConfig(config)

	return &GroqClient{
		client: client,
		model:  model,
		logger: zap.NewNop(),
	}, nil
}

// SetLogger sets the logger for the client
func (g *GroqClient) SetLogger(logger *zap.Logger) {
	g.logger = logger
}

// Chat sends a chat completion request to Groq
func (g *GroqClient) Chat(ctx context.Context, messages []openai.ChatCompletionMessage) (string, error) {
	resp, err := g.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model:    g.model,
			Messages: messages,
		},
	)

	if err != nil {
		return "", fmt.Errorf("failed to create chat completion: %w", err)
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response from model")
	}

	return resp.Choices[0].Message.Content, nil
}

// ClassifyIntent uses the LLM to classify the user's intent.
func (g *GroqClient) ClassifyIntent(ctx context.Context, request string) (string, error) {
	prompt := fmt.Sprintf(`The user sent the following request: "%s"
Is the user explicitly asking to execute a command in the terminal, asking for code to be generated/modified, or something else?
Respond with only one of the following words: "TERMINAL", "CODE", or "GENERAL".`, request)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: "You are an expert at classifying user intent. Respond with only one word: TERMINAL, CODE, or GENERAL.",
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: prompt,
		},
	}

	return g.Chat(ctx, messages)
}

// AnalyzeError analyzes a terminal error and suggests fixes
func (g *GroqClient) AnalyzeError(ctx context.Context, errorOutput, fileContent string) (string, error) {
	prompt := fmt.Sprintf(`Analyze this terminal error and suggest a fix:

Error Output:
%s

File Content:
%s

Please provide:
1. What caused the error
2. How to fix it
3. The corrected code if applicable

Respond in a clear, actionable format.`, errorOutput, fileContent)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: "You are an expert debugging assistant. Analyze errors and provide clear, actionable solutions.",
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: prompt,
		},
	}

	return g.Chat(ctx, messages)
}

// GenerateCommand converts natural language to shell commands
func (g *GroqClient) GenerateCommand(ctx context.Context, instruction string) (string, error) {
	prompt := fmt.Sprintf(`Convert this natural language instruction to a shell command:

Instruction: %s

Provide only the shell command, no explanations. If multiple commands are needed, separate them with && or ; as appropriate.`, instruction)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: "You are a command-line expert. Convert natural language to exact shell commands.",
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: prompt,
		},
	}

	return g.Chat(ctx, messages)
}

// PlanProject creates a project plan from natural language description
func (g *GroqClient) PlanProject(ctx context.Context, description string) (string, error) {
	prompt := fmt.Sprintf(`Create a detailed project plan for: %s

Include:
1. Project structure (folders and files)
2. Technology stack
3. Key files to create
4. Setup commands
5. Dependencies to install

Format as JSON with the following structure:
{
  "name": "project name",
  "description": "brief description",
  "structure": {
    "folders": ["list", "of", "folders"],
    "files": ["list", "of", "files"]
  },
  "tech_stack": {
    "frontend": "...",
    "backend": "...",
    "database": "..."
  },
  "setup_commands": ["command1", "command2"],
  "dependencies": {
    "frontend": ["dep1", "dep2"],
    "backend": ["dep1", "dep2"]
  }
}`, description)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: "You are a project architect. Create detailed project plans from natural language descriptions.",
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: prompt,
		},
	}

	return g.Chat(ctx, messages)
}

// GenerateCode generates code based on requirements
func (g *GroqClient) GenerateCode(ctx context.Context, requirements, context string) (string, error) {
	prompt := fmt.Sprintf(`Generate code based on these requirements:

Requirements: %s

Context: %s

Provide only the code, no explanations unless specifically requested.`, requirements, context)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: "You are an expert programmer. Generate clean, working code based on requirements.",
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: prompt,
		},
	}

	return g.Chat(ctx, messages)
}

// SetModel changes the model used for requests
func (g *GroqClient) SetModel(model string) {
	g.model = model
}

// GetModel returns the current model
func (g *GroqClient) GetModel() string {
	return g.model
}
