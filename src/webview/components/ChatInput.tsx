import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string, files: File[]) => void;
  disabled?: boolean;
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  disabled = false,
  files,
  setFiles,
  message,
  setMessage
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || files.length > 0) && !disabled) {
      onSendMessage(message.trim(), files);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  return (
    <div className="chat-input-container">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-row">
          <div className="file-upload-container">
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileChange}
              disabled={disabled}
              style={{ display: 'none' }}
            />
            <label htmlFor="file-upload" className="file-upload-btn" title="Attach files">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </label>
          </div>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message, or drag and drop files"
            disabled={disabled}
            className="message-input"
            rows={1}
          />
          <button 
            type="submit" 
            disabled={(!message.trim() && files.length === 0) || disabled}
            className="send-button"
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {files.length > 0 && (
          <div className="file-preview-container">
            {files.map((file, index) => (
              <div key={index} className="file-info">
                <span className="file-name">{file.name}</span>
                <button
                  type="button"
                  className="remove-file-btn"
                  onClick={() => handleRemoveFile(file)}
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </form>

      <style>{`
        .chat-input-container { position: relative; padding: 10px 20px; background: #181a19; border-top: 1px solid #00ff90; }
        .drag-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 255, 144, 0.2); border: 2px dashed #00ff90; display: flex; align-items: center; justify-content: center; z-index: 10; pointer-events: none; }
        .drag-overlay p { color: #00ff90; font-size: 1.2em; font-weight: bold; }
        .chat-input-form { display: flex; flex-direction: column; gap: 10px; }
        .input-row { display: flex; align-items: flex-end; gap: 12px; background: #232825; border: 1.5px solid #00ff90; border-radius: 12px; padding: 8px 12px; }
        .file-upload-container { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .file-upload-btn { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: #181a19; border: 1.5px solid #00ff90; border-radius: 8px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; color: #00ff90; }
        .file-upload-btn:hover { background: #00ff9020; }
        .file-preview-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; }
        .file-info { display: flex; align-items: center; gap: 8px; background: #232825; border: 1px solid #00ff90; border-radius: 6px; padding: 4px 8px; max-width: 200px; }
        .file-name { color: #00ff90; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .remove-file-btn { background: none; border: none; color: #ff4444; cursor: pointer; font-size: 16px; padding: 0; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }
        .message-input { flex: 1; background: transparent; border: none; color: #fff; font-size: 14px; resize: none; outline: none; min-height: 24px; max-height: 200px; font-family: inherit; padding-top: 8px; padding-bottom: 8px; }
        .message-input::placeholder { color: #666; }
        .send-button { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; background: #00ff90; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .send-button:hover:not(:disabled) { background: #00cc73; }
        .send-button:disabled { background: #666; cursor: not-allowed; }
        .send-button svg path { stroke: #111312; }
      `}</style>
    </div>
  );
};

export default ChatInput; 