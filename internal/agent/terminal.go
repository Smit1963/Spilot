package agent

import (
	"context"
	"fmt"

	"go.uber.org/zap"
)

type TerminalAgentImpl struct {
	commandExec CommandExecutor
	llmClient   LLMClient
	logger      *zap.Logger
}

func NewTerminalAgent(commandExec CommandExecutor, llmClient LLMClient, logger *zap.Logger) *TerminalAgentImpl {
	return &TerminalAgentImpl{
		commandExec: commandExec,
		llmClient:   llmClient,
		logger:      logger,
	}
}

func (t *TerminalAgentImpl) Type() AgentType {
	return TerminalAgent
}

func (t *TerminalAgentImpl) Execute(ctx context.Context, task *Task) (*TaskResult, error) {
	t.logger.Info("Terminal agent executing task", zap.String("task_id", task.ID))
	instruction, ok := task.Data["instruction"].(string)
	if !ok {
		return nil, fmt.Errorf("instruction not found in task data")
	}
	workingDir, ok := task.Data["workspace_dir"].(string)
	if !ok {
		workingDir = "."
	}
	command, err := t.llmClient.GenerateCommand(ctx, instruction)
	if err != nil {
		return nil, fmt.Errorf("failed to generate command: %w", err)
	}
	result, err := t.commandExec.ExecuteCommand(command, workingDir)
	if err != nil {
		return &TaskResult{Success: false, Error: err.Error()}, nil
	}
	return &TaskResult{
		Success: result.Error == "",
		Data: map[string]interface{}{
			"command": command,
			"output":  result.Output,
			"error":   result.Error,
		},
	}, nil
}
