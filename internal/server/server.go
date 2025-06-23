package server

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"spilot-agent/internal/agent"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

// Server represents the HTTP server
type Server struct {
	agentSystem *agent.System
	logger      *zap.Logger
	server      *http.Server
}

// Request represents an incoming request
type Request struct {
	Type         string                 `json:"type"`
	Command      string                 `json:"command,omitempty"`
	Args         string                 `json:"args,omitempty"`
	Request      string                 `json:"request,omitempty"`
	WorkspaceDir string                 `json:"workspace_dir,omitempty"`
	Model        string                 `json:"model,omitempty"`
	Data         map[string]interface{} `json:"data,omitempty"`
}

// Response represents a response to a request
type Response struct {
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data,omitempty"`
	Error   string                 `json:"error,omitempty"`
}

// New creates a new server
func New(agentSystem *agent.System, logger *zap.Logger) *Server {
	return &Server{
		agentSystem: agentSystem,
		logger:      logger,
	}
}

// Start starts the HTTP server
func (s *Server) Start(port string) error {
	router := s.setupRoutes()

	s.server = &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	s.logger.Info("Starting server", zap.String("port", port))
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

// setupRoutes sets up the HTTP routes
func (s *Server) setupRoutes() *mux.Router {
	router := mux.NewRouter()

	// Health check
	router.HandleFunc("/health", s.handleHealth).Methods("GET")

	// Agent endpoints
	router.HandleFunc("/api/process", s.handleProcessRequest).Methods("POST")
	router.HandleFunc("/api/command", s.handleCommand).Methods("POST")
	router.HandleFunc("/api/chat", s.handleChat).Methods("POST")

	// Add CORS middleware
	router.Use(s.corsMiddleware)

	return router
}

// corsMiddleware adds CORS headers
func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// handleHealth handles health check requests
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

// handleProcessRequest handles general processing requests
func (s *Server) handleProcessRequest(w http.ResponseWriter, r *http.Request) {
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Set the model if provided in the request
	if req.Model != "" {
		s.agentSystem.SetModel(req.Model)
	}

	ctx := r.Context()
	result, err := s.agentSystem.ProcessUserRequest(ctx, req.Request, req.WorkspaceDir)
	if err != nil {
		s.sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.sendResponse(w, result)
}

// handleCommand handles command requests
func (s *Server) handleCommand(w http.ResponseWriter, r *http.Request) {
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	result, err := s.agentSystem.HandleCommand(ctx, req.Command, req.Args, req.WorkspaceDir)
	if err != nil {
		s.sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	s.sendResponse(w, result)
}

// handleChat handles chat requests
func (s *Server) handleChat(w http.ResponseWriter, r *http.Request) {
	var req Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// For chat, we'll use the LLM client directly
	// This is a simplified implementation
	response := Response{
		Success: true,
		Data: map[string]interface{}{
			"message": "Chat functionality will be implemented here",
		},
	}

	s.sendJSON(w, response)
}

// sendResponse sends a task result as a response
func (s *Server) sendResponse(w http.ResponseWriter, result *agent.TaskResult) {
	response := Response{
		Success: result.Success,
		Data:    result.Data,
		Error:   result.Error,
	}

	s.sendJSON(w, response)
}

// sendError sends an error response
func (s *Server) sendError(w http.ResponseWriter, message string, status int) {
	response := Response{
		Success: false,
		Error:   message,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}

// sendJSON sends a JSON response
func (s *Server) sendJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
