package agent

import (
	"fmt"
	"os"
	"path/filepath"
)

// FileManagerImpl implements the FileManager interface
type FileManagerImpl struct{}

// NewFileManager creates a new file manager
func NewFileManager() FileManager {
	return &FileManagerImpl{}
}

// CreateFile creates a new file with the given content
func (f *FileManagerImpl) CreateFile(path, content string) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create directory for %s: %w", path, err)
	}

	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", path, err)
	}
	defer file.Close()

	if _, err := file.WriteString(content); err != nil {
		return fmt.Errorf("failed to write to file %s: %w", path, err)
	}
	return nil
}

// UpdateFile updates an existing file with new content
func (f *FileManagerImpl) UpdateFile(path, content string) error {
	if !f.FileExists(path) {
		return fmt.Errorf("file does not exist: %s", path)
	}
	return os.WriteFile(path, []byte(content), 0644)
}

// DeleteFile deletes a file
func (f *FileManagerImpl) DeleteFile(path string) error {
	return os.Remove(path)
}

// ReadFile reads the content of a file
func (f *FileManagerImpl) ReadFile(path string) (string, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

// FileExists checks if a file exists
func (f *FileManagerImpl) FileExists(path string) bool {
	_, err := os.Stat(path)
	return !os.IsNotExist(err)
}

// ListFiles lists all files in a directory recursively
func (f *FileManagerImpl) ListFiles(dir string) ([]string, error) {
	var files []string
	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			relPath, err := filepath.Rel(dir, path)
			if err != nil {
				return err
			}
			files = append(files, relPath)
		}
		return nil
	})
	return files, err
}
