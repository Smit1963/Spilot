package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// PlanningAgent handles high-level planning and task breakdown
type PlanningAgentImpl struct {
	llmClient LLMClient
	logger    *zap.Logger
}

// NewPlanningAgent creates a new planning agent
func NewPlanningAgent(llmClient LLMClient, logger *zap.Logger) *PlanningAgentImpl {
	return &PlanningAgentImpl{
		llmClient: llmClient,
		logger:    logger,
	}
}

// Type returns the agent type
func (p *PlanningAgentImpl) Type() AgentType {
	return PlanningAgent
}

// Execute executes a planning task
func (p *PlanningAgentImpl) Execute(ctx context.Context, task *Task) (*TaskResult, error) {
	p.logger.Info("Planning agent executing task", zap.String("task_id", task.ID))

	request, ok := task.Data["request"].(string)
	if !ok {
		return nil, fmt.Errorf("request data not found in task")
	}

	// Route to specific handlers based on command
	if strings.HasPrefix(request, "/create-project") {
		description := strings.TrimSpace(strings.TrimPrefix(request, "/create-project"))
		plan, err := p.handleProjectCreation(ctx, description)
		if err != nil {
			return nil, err
		}
		return &TaskResult{Success: true, Data: map[string]interface{}{"plan": plan}}, nil
	}

	if strings.HasPrefix(request, "/explain") {
		target := strings.TrimSpace(strings.TrimPrefix(request, "/explain"))
		explanation, err := p.handleExplainRequest(ctx, target)
		if err != nil {
			return nil, err
		}
		return &TaskResult{Success: true, Data: map[string]interface{}{"explanation": explanation}}, nil
	}

	// Generic planning for other natural language requests
	plan, err := p.createGenericPlan(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to create plan: %w", err)
	}

	return &TaskResult{
		Success: true,
		Data:    map[string]interface{}{"plan": plan},
	}, nil
}

// createGenericPlan creates a generic plan from a natural language request
func (p *PlanningAgentImpl) createGenericPlan(ctx context.Context, request string) (string, error) {
	prompt := fmt.Sprintf(`%s
User request: "%s"
Generate a JSON array of tasks. Each task must have a "type" (e.g., "file", "terminal"), a "description", and a "data" object with necessary parameters.
For file tasks, data should include "operation", "path", and "content".
For terminal tasks, data should include "instruction".

Example Request: "create a new directory called 'server' and inside it, create a file named 'main.go' with a basic hello world program"
Example Response:
[
  {
    "type": "file",
    "description": "Create main.go",
    "data": {
      "operation": "create",
      "path": "server/main.go",
      "content": "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"hello world\")\n}"
    }
  }
]`, SystemPrompt, request)

	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: SystemPrompt},
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}

	planJSON, err := p.llmClient.Chat(ctx, messages)
	if err != nil {
		return "", fmt.Errorf("LLM failed to generate a plan: %w", err)
	}
	return planJSON, nil
}

// handleExplainRequest handles requests to explain code or concepts
func (p *PlanningAgentImpl) handleExplainRequest(ctx context.Context, target string) (string, error) {
	prompt := fmt.Sprintf(`Explain the following code or concept in a clear, concise way for a developer: "%s"`, target)
	messages := []openai.ChatCompletionMessage{
		{Role: openai.ChatMessageRoleSystem, Content: "You are an expert programming instructor."},
		{Role: openai.ChatMessageRoleUser, Content: prompt},
	}
	return p.llmClient.Chat(ctx, messages)
}

// handleProjectCreation handles requests to create a full project from a description
func (p *PlanningAgentImpl) handleProjectCreation(ctx context.Context, description string) (*ProjectPlan, error) {
	planJSON, err := p.llmClient.PlanProject(ctx, description)
	if err != nil {
		return nil, fmt.Errorf("LLM failed to generate project plan: %w", err)
	}

	var plan ProjectPlan
	if err := json.Unmarshal([]byte(planJSON), &plan); err != nil {
		return nil, fmt.Errorf("failed to parse project plan JSON from LLM: %w. Raw response: %s", err, planJSON)
	}

	return &plan, nil
}
