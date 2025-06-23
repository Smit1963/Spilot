package agent

import (
	"bytes"
	"fmt"
	"os/exec"
	"time"
)

// CommandExecutorImpl implements the CommandExecutor interface
type CommandExecutorImpl struct{}

// NewCommandExecutor creates a new command executor
func NewCommandExecutor() CommandExecutor {
	return &CommandExecutorImpl{}
}

// ExecuteCommand executes a single command
func (c *CommandExecutorImpl) ExecuteCommand(command, workingDir string) (*Command, error) {
	cmd := exec.Command("sh", "-c", command)
	cmd.Dir = workingDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	startTime := time.Now()
	err := cmd.Run()

	result := &Command{
		ID:         fmt.Sprintf("cmd_%d", startTime.UnixNano()),
		Command:    command,
		WorkingDir: workingDir,
		Status:     "completed",
		Output:     stdout.String(),
		Error:      stderr.String(),
		CreatedAt:  startTime,
	}

	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("%s: %s", err.Error(), stderr.String())
	}

	return result, nil
}

// ExecuteCommands executes multiple commands
func (c *CommandExecutorImpl) ExecuteCommands(commands []string, workingDir string) ([]*Command, error) {
	var results []*Command

	for _, command := range commands {
		result, err := c.ExecuteCommand(command, workingDir)
		if err != nil {
			return results, err
		}
		results = append(results, result)

		// If command failed, stop execution
		if result.Status == "failed" {
			break
		}
	}

	return results, nil
}
