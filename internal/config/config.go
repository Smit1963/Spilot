package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

// Config holds all configuration for the application
type Config struct {
	GroqAPIKey   string `mapstructure:"groq_api_key"`
	DefaultModel string `mapstructure:"default_model"`
	LogLevel     string `mapstructure:"log_level"`
	WorkspaceDir string `mapstructure:"workspace_dir"`
	Port         string `mapstructure:"port"`
}

// Load reads configuration from file or environment variables
func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	// Set defaults
	// Allowed models: deepseek-r1-distill-llama-70b, meta-llama/llama-4-maverick-17b-128e-instruct, llama-3.1-8b-instant
	viper.SetDefault("default_model", "llama-3.1-8b-instant")
	viper.SetDefault("log_level", "info")
	viper.SetDefault("port", "8080")

	// Read environment variables
	viper.AutomaticEnv()

	// Try to read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Validate required fields
	if config.GroqAPIKey == "" {
		config.GroqAPIKey = os.Getenv("GROQ_API_KEY")
		if config.GroqAPIKey == "" {
			return nil, fmt.Errorf("GROQ_API_KEY is required")
		}
	}

	// Set workspace directory
	if config.WorkspaceDir == "" {
		config.WorkspaceDir = os.Getenv("WORKSPACE_DIR")
		if config.WorkspaceDir == "" {
			config.WorkspaceDir = "."
		}
	}

	// Set port if not specified
	if config.Port == "" {
		config.Port = "8080"
	}

	return &config, nil
}
