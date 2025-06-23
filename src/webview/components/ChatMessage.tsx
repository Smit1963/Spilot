import React from 'react';
import ReactMarkdown from 'react-markdown';
import { VscAccount, VscRobot, VscClippy } from 'react-icons/vsc';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ content, role, timestamp }) => {
  const isUser = role === 'user';

  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const handleCopy = () => {
      navigator.clipboard.writeText(String(children));
    };

    return !inline && match ? (
      <div className="code-block">
        <button className="copy-button" onClick={handleCopy} title="Copy code">
          <VscClippy />
        </button>
        <pre className={className} {...props}>
          {children}
        </pre>
      </div>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  return (
    <div className={`message ${isUser ? 'user-message' : 'assistant-message'}`}>
      <div className="message-header">
        {isUser ? <VscAccount className="icon" /> : <VscRobot className="icon" />}
        <span>{isUser ? 'User' : 'AI'}</span>
      </div>
      <div className="message-content">
        <ReactMarkdown components={{ code: CodeBlock }}>{content}</ReactMarkdown>
      </div>

      <style>{`
        .message {
          padding: 18px 28px;
          margin: 10px 0;
          border-radius: 12px;
          max-width: 80%; /* Use 80% width */
          background: #181a19;
          border: 2px solid #00ff90;
          color: #fff;
          box-shadow: none;
          transition: background 0.2s, border 0.2s;
        }
        .user-message {
          margin-left: auto; /* Align to the right */
          border-style: dashed;
        }
        .assistant-message {
          margin-right: auto; /* Align to the left */
        }

        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-weight: bold;
            color: #00ff90;
        }
        
        .message-header .icon {
            margin-right: 8px;
        }

        .code-block {
          position: relative;
        }

        .copy-button {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #333;
          color: white;
          border: none;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .copy-button:hover {
          opacity: 1;
        }

        .message-content {
          font-size: 16px; /* Slightly smaller for better density */
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
          color: #fff;
        }

        /* Markdown specific styles */
        .message-content pre {
          background: #181a19;
          border: 2px solid #00ff90;
          border-radius: 8px;
          padding: 12px;
          overflow-x: auto;
          font-family: 'Fira Code', 'Consolas', 'monospace';
          color: #fff;
        }

        .message-content code {
          background: #181a19;
          color: #fff;
          padding: 3px 6px;
          border-radius: 4px;
          font-family: 'Fira Code', 'Consolas', 'monospace';
        }
        
        .message-content p {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};

export default ChatMessage; 