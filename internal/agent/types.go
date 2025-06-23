package agent

import (
	"context"
	"time"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// AgentType represents different types of agents
type AgentType string

const (
	PlanningAgent AgentType = "planning"
	FileAgent     AgentType = "file"
	TerminalAgent AgentType = "terminal"
	DebugAgent    AgentType = "debug"
)

// Task represents a task to be executed by an agent
type Task struct {
	ID          string                 `json:"id"`
	Type        AgentType              `json:"type"`
	Description string                 `json:"description"`
	Data        map[string]interface{} `json:"data"`
	Status      TaskStatus             `json:"status"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
	Result      *TaskResult            `json:"result,omitempty"`
}

// TaskStatus represents the status of a task
type TaskStatus string

const (
	TaskPending   TaskStatus = "pending"
	TaskRunning   TaskStatus = "running"
	TaskCompleted TaskStatus = "completed"
	TaskFailed    TaskStatus = "failed"
)

// TaskResult represents the result of a task execution
type TaskResult struct {
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data"`
	Error   string                 `json:"error,omitempty"`
}

// Command represents a shell command to be executed
type Command struct {
	ID         string    `json:"id"`
	Command    string    `json:"command"`
	WorkingDir string    `json:"working_dir"`
	Status     string    `json:"status"`
	Output     string    `json:"output"`
	Error      string    `json:"error"`
	CreatedAt  time.Time `json:"created_at"`
}

// FileOperation represents a file operation
type FileOperation struct {
	Type    string `json:"type"` // create, update, delete
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
}

// ProjectPlan represents a project plan
type ProjectPlan struct {
	Name         string              `json:"name"`
	Description  string              `json:"description"`
	Structure    ProjectStructure    `json:"structure"`
	TechStack    map[string]string   `json:"tech_stack"`
	Setup        []string            `json:"setup"`
	Dependencies map[string][]string `json:"dependencies"`
	Files        []ProjectFile       `json:"files"`
}

// ProjectStructure represents the folder structure of a project
type ProjectStructure struct {
	Folders []string `json:"folders"`
	Files   []string `json:"files"`
}

// ProjectFile represents a file to be created in a project
type ProjectFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// Agent interface defines the contract for all agents
type Agent interface {
	Type() AgentType
	Execute(ctx context.Context, task *Task) (*TaskResult, error)
}

// LLMClient interface for LLM operations
type LLMClient interface {
	Chat(ctx context.Context, messages []openai.ChatCompletionMessage) (string, error)
	ClassifyIntent(ctx context.Context, request string) (string, error)
	AnalyzeError(ctx context.Context, errorOutput, fileContent string) (string, error)
	GenerateCommand(ctx context.Context, instruction string) (string, error)
	PlanProject(ctx context.Context, description string) (string, error)
	GenerateCode(ctx context.Context, requirements, context string) (string, error)
	SetModel(model string)
	GetModel() string
}

// FileManager interface for file operations
type FileManager interface {
	CreateFile(path, content string) error
	UpdateFile(path, content string) error
	DeleteFile(path string) error
	ReadFile(path string) (string, error)
	FileExists(path string) bool
	ListFiles(dir string) ([]string, error)
}

// CommandExecutor interface for command execution
type CommandExecutor interface {
	ExecuteCommand(command, workingDir string) (*Command, error)
	ExecuteCommands(commands []string, workingDir string) ([]*Command, error)
}

// System represents the main agent system
type System struct {
	agents      map[AgentType]Agent
	llmClient   LLMClient
	fileManager FileManager
	commandExec CommandExecutor
	taskQueue   chan *Task
	results     map[string]*TaskResult
	logger      *zap.Logger
}
