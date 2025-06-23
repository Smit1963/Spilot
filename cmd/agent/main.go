package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"spilot-agent/internal/agent"
	"spilot-agent/internal/config"
	"spilot-agent/internal/llm"
	"spilot-agent/internal/server"

	"go.uber.org/zap"
)

func main() {
	// Initialize logger
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("Failed to load configuration", zap.Error(err))
	}

	// Initialize LLM client
	llmClient, err := llm.NewGroqClient(cfg.GroqAPIKey, cfg.DefaultModel)
	if err != nil {
		logger.Fatal("Failed to initialize LLM client", zap.Error(err))
	}

	// Initialize agent system
	agentSystem := agent.NewSystem(llmClient, logger)

	// Initialize HTTP server
	srv := server.New(agentSystem, logger)

	// Start server in a goroutine
	go func() {
		logger.Info("Starting Spilot Agent server", zap.String("port", cfg.Port))
		if err := srv.Start(cfg.Port); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Create a deadline for server shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}

	logger.Info("Server exited")
}
