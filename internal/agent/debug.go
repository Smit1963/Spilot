package agent

import (
	"context"
	"fmt"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// DebugAgent handles error analysis and debugging
type DebugAgentImpl struct {
	llmClient   LLMClient
	fileManager FileManager
	logger      *zap.Logger
}

// NewDebugAgent creates a new debug agent
func NewDebugAgent(llmClient LLMClient, fileManager FileManager, logger *zap.Logger) *DebugAgentImpl {
	return &DebugAgentImpl{
		llmClient:   llmClient,
		fileManager: fileManager,
		logger:      logger,
	}
}

// Type returns the agent type
func (d *DebugAgentImpl) Type() AgentType {
	return DebugAgent
}

// Execute executes a debug task
func (d *DebugAgentImpl) Execute(ctx context.Context, task *Task) (*TaskResult, error) {
	d.logger.Info("Debug agent executing task", zap.String("task_id", task.ID))

	errorOutput, ok := task.Data["error_output"].(string)
	if !ok {
		return nil, fmt.Errorf("error_output not found in task data")
	}

	workspaceDir, ok := task.Data["workspace_dir"].(string)
	if !ok {
		workspaceDir = "."
	}

	// Try to identify the file with the error
	filePath, fileContent := d.identifyErrorFile(errorOutput, workspaceDir)

	// Analyze the error
	analysis, err := d.llmClient.AnalyzeError(ctx, errorOutput, fileContent)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze error: %w", err)
	}

	// Generate fix
	fix, err := d.generateFix(ctx, errorOutput, fileContent, analysis)
	if err != nil {
		return nil, fmt.Errorf("failed to generate fix: %w", err)
	}

	return &TaskResult{
		Success: true,
		Data: map[string]interface{}{
			"analysis": analysis,
			"fix":      fix,
			"file":     filePath,
		},
	}, nil
}

// identifyErrorFile tries to identify the file containing the error
func (d *DebugAgentImpl) identifyErrorFile(_, _ string) (string, string) {
	// This is a simplified implementation
	// In a real implementation, you would parse the error output
	// to extract file paths and line numbers

	// For now, return empty strings
	return "", ""
}

// generateFix generates a fix for the error
func (d *DebugAgentImpl) generateFix(ctx context.Context, errorOutput, _, analysis string) (string, error) {
	prompt := fmt.Sprintf(`Based on this error analysis:

%s

And the original error:
%s

Generate the corrected code. Provide only the fixed code, no explanations.`, analysis, errorOutput)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: "You are an expert debugger. Generate corrected code based on error analysis.",
		},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: prompt,
		},
	}

	return d.llmClient.Chat(ctx, messages)
}
