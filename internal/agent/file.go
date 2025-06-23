package agent

import (
	"context"
	"fmt"
	"path/filepath"

	"go.uber.org/zap"
)

// FileAgent handles file operations
type FileAgentImpl struct {
	fileManager FileManager
	logger      *zap.Logger
}

// NewFileAgent creates a new file agent
func NewFileAgent(fileManager FileManager, logger *zap.Logger) *FileAgentImpl {
	return &FileAgentImpl{
		fileManager: fileManager,
		logger:      logger,
	}
}

// Type returns the agent type
func (f *FileAgentImpl) Type() AgentType {
	return FileAgent
}

// Execute executes a file operation task
func (f *FileAgentImpl) Execute(ctx context.Context, task *Task) (*TaskResult, error) {
	f.logger.Info("File agent executing task", zap.String("task_id", task.ID))

	operation, ok := task.Data["operation"].(string)
	if !ok {
		return nil, fmt.Errorf("operation data not found in task")
	}

	switch operation {
	case "create":
		return f.handleCreateFile(ctx, task)
	case "update":
		return f.handleUpdateFile(ctx, task)
	case "delete":
		return f.handleDeleteFile(ctx, task)
	case "read":
		return f.handleReadFile(ctx, task)
	default:
		return nil, fmt.Errorf("unknown file operation: %s", operation)
	}
}

func (f *FileAgentImpl) handleCreateFile(_ context.Context, task *Task) (*TaskResult, error) {
	path, ok := task.Data["path"].(string)
	if !ok {
		return nil, fmt.Errorf("path not found in task data")
	}

	content, ok := task.Data["content"].(string)
	if !ok {
		content = ""
	}

	workspaceDir, ok := task.Data["workspace_dir"].(string)
	if !ok {
		return nil, fmt.Errorf("workspace_dir not found in task data")
	}
	fullPath := filepath.Join(workspaceDir, path)

	if err := f.fileManager.CreateFile(fullPath, content); err != nil {
		return &TaskResult{Success: false, Error: err.Error()}, nil
	}

	return &TaskResult{
		Success: true,
		Data:    map[string]interface{}{"path": fullPath, "created": true},
	}, nil
}

func (f *FileAgentImpl) handleUpdateFile(_ context.Context, task *Task) (*TaskResult, error) {
	path, ok := task.Data["path"].(string)
	if !ok {
		return nil, fmt.Errorf("path not found in task data")
	}
	content, ok := task.Data["content"].(string)
	if !ok {
		return nil, fmt.Errorf("content not found for update operation")
	}
	workspaceDir, ok := task.Data["workspace_dir"].(string)
	if !ok {
		return nil, fmt.Errorf("workspace_dir not found in task data")
	}
	fullPath := filepath.Join(workspaceDir, path)

	if err := f.fileManager.UpdateFile(fullPath, content); err != nil {
		return &TaskResult{Success: false, Error: err.Error()}, nil
	}

	return &TaskResult{
		Success: true,
		Data:    map[string]interface{}{"path": fullPath, "updated": true},
	}, nil
}

func (f *FileAgentImpl) handleDeleteFile(_ context.Context, task *Task) (*TaskResult, error) {
	path, ok := task.Data["path"].(string)
	if !ok {
		return nil, fmt.Errorf("path not found in task data")
	}
	workspaceDir, ok := task.Data["workspace_dir"].(string)
	if !ok {
		return nil, fmt.Errorf("workspace_dir not found in task data")
	}
	fullPath := filepath.Join(workspaceDir, path)

	if err := f.fileManager.DeleteFile(fullPath); err != nil {
		return &TaskResult{Success: false, Error: err.Error()}, nil
	}

	return &TaskResult{
		Success: true,
		Data:    map[string]interface{}{"path": fullPath, "deleted": true},
	}, nil
}

func (f *FileAgentImpl) handleReadFile(_ context.Context, task *Task) (*TaskResult, error) {
	path, ok := task.Data["path"].(string)
	if !ok {
		return nil, fmt.Errorf("path not found in task data")
	}
	workspaceDir, ok := task.Data["workspace_dir"].(string)
	if !ok {
		return nil, fmt.Errorf("workspace_dir not found in task data")
	}
	fullPath := filepath.Join(workspaceDir, path)

	content, err := f.fileManager.ReadFile(fullPath)
	if err != nil {
		return &TaskResult{Success: false, Error: err.Error()}, nil
	}

	return &TaskResult{
		Success: true,
		Data:    map[string]interface{}{"path": fullPath, "content": content},
	}, nil
}
