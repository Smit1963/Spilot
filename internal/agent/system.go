package agent

import (
	"context"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"
)

// SystemPrompt is used for LLM prompt engineering
const SystemPrompt = `You are an assistant that helps with code and terminal automation. Only suggest or execute terminal commands if the user explicitly asks for it (e.g., "run this in terminal", "execute", "open terminal and..."). For all other requests, provide code, explanations, or other help as appropriate. Never assume a command should be run unless the user is clear.`

// isTerminalIntent checks if the user input is explicitly asking for terminal execution
func isTerminalIntent(input string) bool {
	keywords := []string{"run in terminal", "execute", "open terminal", "run command", "shell", "bash", "powershell", "/run"}
	inputLower := strings.ToLower(input)
	for _, k := range keywords {
		if strings.Contains(inputLower, k) {
			return true
		}
	}
	return false
}

// NewSystem creates a new agent system
func NewSystem(llmClient LLMClient, logger *zap.Logger) *System {
	system := &System{
		agents:      make(map[AgentType]Agent),
		llmClient:   llmClient,
		fileManager: NewFileManager(),
		commandExec: NewCommandExecutor(),
		taskQueue:   make(chan *Task, 100),
		results:     make(map[string]*TaskResult),
		logger:      logger,
	}

	// Initialize agents
	system.agents[PlanningAgent] = NewPlanningAgent(llmClient, logger)
	system.agents[FileAgent] = NewFileAgent(system.fileManager, logger)
	system.agents[TerminalAgent] = NewTerminalAgent(system.commandExec, llmClient, logger)
	system.agents[DebugAgent] = NewDebugAgent(llmClient, system.fileManager, logger)

	// Start task processor
	go system.processTasks()

	return system
}

// ProcessUserRequest handles natural language requests from users
func (s *System) ProcessUserRequest(ctx context.Context, request string, workspaceDir string) (*TaskResult, error) {
	// Use intent classification to route terminal requests directly
	if isTerminalIntent(request) {
		task := &Task{
			ID:          generateTaskID(),
			Type:        TerminalAgent,
			Description: "Execute terminal command (intent classified)",
			Data: map[string]interface{}{
				"instruction":   request,
				"workspace_dir": workspaceDir,
			},
			Status:    TaskPending,
			CreatedAt: time.Now(),
		}
		return s.ExecuteTask(ctx, task)
	}
	// Otherwise, create a planning task to break down the request
	planningTask := &Task{
		ID:          generateTaskID(),
		Type:        PlanningAgent,
		Description: "Plan and execute user request",
		Data: map[string]interface{}{
			"request":       request,
			"workspace_dir": workspaceDir,
		},
		Status:    TaskPending,
		CreatedAt: time.Now(),
	}

	// Execute planning task
	result, err := s.ExecuteTask(ctx, planningTask)
	if err != nil {
		return nil, fmt.Errorf("failed to process request: %w", err)
	}

	return result, nil
}

// ExecuteTask executes a single task
func (s *System) ExecuteTask(ctx context.Context, task *Task) (*TaskResult, error) {
	agent, exists := s.agents[task.Type]
	if !exists {
		return nil, fmt.Errorf("agent type %s not found", task.Type)
	}

	task.Status = TaskRunning
	task.UpdatedAt = time.Now()

	result, err := agent.Execute(ctx, task)
	if err != nil {
		task.Status = TaskFailed
		task.Result = &TaskResult{
			Success: false,
			Error:   err.Error(),
		}
		return task.Result, err
	}

	task.Status = TaskCompleted
	task.Result = result
	task.UpdatedAt = time.Now()

	// Store result
	s.results[task.ID] = result

	return result, nil
}

// ExecuteTaskChain executes a chain of tasks
func (s *System) ExecuteTaskChain(ctx context.Context, tasks []*Task) ([]*TaskResult, error) {
	var results []*TaskResult

	for _, task := range tasks {
		result, err := s.ExecuteTask(ctx, task)
		if err != nil {
			return results, err
		}
		results = append(results, result)

		// If task failed, stop the chain
		if !result.Success {
			break
		}
	}

	return results, nil
}

// processTasks processes tasks from the queue
func (s *System) processTasks() {
	for task := range s.taskQueue {
		ctx := context.Background()
		_, err := s.ExecuteTask(ctx, task)
		if err != nil {
			// Log error but continue processing
			continue
		}
	}
}

// QueueTask adds a task to the processing queue
func (s *System) QueueTask(task *Task) {
	s.taskQueue <- task
}

// GetTaskResult retrieves a task result by ID
func (s *System) GetTaskResult(taskID string) (*TaskResult, bool) {
	result, exists := s.results[taskID]
	return result, exists
}

// SetModel changes the model used by the LLM client
func (s *System) SetModel(model string) {
	s.llmClient.SetModel(model)
}

// HandleCommand handles special commands like /fix, /run, /explain, /create-project
func (s *System) HandleCommand(ctx context.Context, command string, args string, workspaceDir string) (*TaskResult, error) {
	switch command {
	case "/fix":
		return s.handleFixCommand(ctx, args, workspaceDir)
	case "/run":
		return s.handleRunCommand(ctx, args, workspaceDir)
	case "/explain":
		return s.handleExplainCommand(ctx, args, workspaceDir)
	case "/create-project":
		return s.handleCreateProjectCommand(ctx, args, workspaceDir)
	default:
		return nil, fmt.Errorf("unknown command: %s", command)
	}
}

// handleFixCommand handles the /fix command
func (s *System) handleFixCommand(ctx context.Context, errorOutput string, workspaceDir string) (*TaskResult, error) {
	task := &Task{
		ID:          generateTaskID(),
		Type:        DebugAgent,
		Description: "Fix error in code",
		Data: map[string]interface{}{
			"error_output":  errorOutput,
			"workspace_dir": workspaceDir,
		},
		Status:    TaskPending,
		CreatedAt: time.Now(),
	}

	return s.ExecuteTask(ctx, task)
}

// handleRunCommand handles the /run command
func (s *System) handleRunCommand(ctx context.Context, instruction string, workspaceDir string) (*TaskResult, error) {
	task := &Task{
		ID:          generateTaskID(),
		Type:        TerminalAgent,
		Description: "Execute command",
		Data: map[string]interface{}{
			"instruction":   instruction,
			"workspace_dir": workspaceDir,
		},
		Status:    TaskPending,
		CreatedAt: time.Now(),
	}

	return s.ExecuteTask(ctx, task)
}

// handleExplainCommand handles the /explain command
func (s *System) handleExplainCommand(ctx context.Context, target string, workspaceDir string) (*TaskResult, error) {
	task := &Task{
		ID:          generateTaskID(),
		Type:        PlanningAgent,
		Description: "Explain code or concept",
		Data: map[string]interface{}{
			"target":        target,
			"workspace_dir": workspaceDir,
		},
		Status:    TaskPending,
		CreatedAt: time.Now(),
	}

	return s.ExecuteTask(ctx, task)
}

// handleCreateProjectCommand handles the /create-project command
func (s *System) handleCreateProjectCommand(ctx context.Context, description string, workspaceDir string) (*TaskResult, error) {
	task := &Task{
		ID:          generateTaskID(),
		Type:        PlanningAgent,
		Description: "Create project from description",
		Data: map[string]interface{}{
			"description":   description,
			"workspace_dir": workspaceDir,
		},
		Status:    TaskPending,
		CreatedAt: time.Now(),
	}

	return s.ExecuteTask(ctx, task)
}

// generateTaskID generates a unique task ID
func generateTaskID() string {
	return fmt.Sprintf("task_%d", time.Now().UnixNano())
}
