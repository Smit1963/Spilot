import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ChatHeaderControls from './components/ChatHeaderControls';
// This is a test comment to verify file modification capability.

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

const vscode = (window as any).acquireVsCodeApi ? (window as any).acquireVsCodeApi() : null;

const ChatApp: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSidebarChatId, setEditingSidebarChatId] = useState<string | null>(null);
  const [editingSidebarChatName, setEditingSidebarChatName] = useState<string>('');
  const [editingHeaderChatId, setEditingHeaderChatId] = useState<string | null>(null);
  const [editingHeaderChatName, setEditingHeaderChatName] = useState<string>('');
  const [agentMode, setAgentMode] = useState<'agent' | 'manual'>('agent');
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.1-8b-instant');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleModelChange = (model: string) => {
    console.log(`ChatApp: handleModelChange called with model: ${model}`);
    setSelectedModel(model);
  };

  console.log(`ChatApp: Rendering with selectedModel: ${selectedModel}`);

  const activeConversation = activeConversationId
    ? conversations.find((conv) => conv.id === activeConversationId)
    : null;
  const messages = activeConversation ? activeConversation.messages : [];

  // Load state from VS Code API on initial mount
  useEffect(() => {
    if (vscode) {
      const savedState = vscode.getState();
      if (savedState && savedState.conversations) {
        const loadedConversations: Conversation[] = savedState.conversations.map((conv: any) => ({
          ...conv,
          timestamp: new Date(conv.timestamp),
          messages: conv.messages.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) }))
        }));
        setConversations(loadedConversations);
        if (savedState.activeConversationId) {
          setActiveConversationId(savedState.activeConversationId);
        }
      }
    }
  }, []);

  // Save state to VS Code API whenever conversations or activeConversationId changes
  useEffect(() => {
    if (vscode) {
      vscode.setState({ conversations, activeConversationId });
    }
  }, [conversations, activeConversationId]);

  // Scroll to bottom of messages whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeConversationId]);

  const handleMessage = (event: MessageEvent) => {
    const { type, text, conversationId } = event.data;
    if (type === 'chatResponse') {
      setConversations((prevConversations) => {
        return prevConversations.map((conv) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: [
                ...conv.messages,
                { id: `msg-${Date.now()}`, content: text, role: 'assistant', timestamp: new Date() },
              ],
            };
          }
          return conv;
        });
      });
      setIsLoading(false);
    } else if (type === 'error') {
      setError(text);
      setIsLoading(false);
    }
  };

  const sendMessage = (messageContent: string, files: File[]) => {
    if (!activeConversationId) return;

    const fileNames = files.map(file => file.name).join(', ');
    const messageWithFiles = messageContent + (files.length > 0 ? `\n[Files: ${fileNames}]` : '');

    const newUserMessage: Message = {
      id: `msg-${Date.now()}`,
      content: messageWithFiles,
      role: 'user',
      timestamp: new Date(),
    };

    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        if (conv.id === activeConversationId) {
          return { ...conv, messages: [...conv.messages, newUserMessage] };
        }
        return conv;
      });
    });
    setIsLoading(true);

    if (vscode) {
      const readFilesAsText = (filesToRead: File[]): Promise<{ name: string; content: string }[]> => {
        const promises = filesToRead.map(file => {
          return new Promise<{ name: string; content: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({ name: file.name, content: reader.result as string });
            };
            reader.onerror = () => {
              reject(reader.error);
            };
            reader.readAsText(file);
          });
        });
        return Promise.all(promises);
      };
      
      readFilesAsText(files)
        .then(fileData => {
          vscode.postMessage({
            type: 'chat',
            text: messageContent,
            conversationId: activeConversationId,
            files: fileData,
            agentMode,
            model: selectedModel,
          });
        })
        .catch(err => {
          console.error("Error reading files: ", err);
          setError("There was an error reading one of the files.");
          setIsLoading(false);
        });
    }
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: `New Chat ${conversations.length + 1}`,
      messages: [{ id: `msg-${Date.now()}`, content: 'Hi! I am Spilot. How can I help you today?', role: 'assistant', timestamp: new Date() }],
      timestamp: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleBackToChatList = () => {
    setActiveConversationId(null);
  };

  const handleEditSidebarChatName = (id: string, name: string) => {
    setEditingSidebarChatId(id);
    setEditingSidebarChatName(name);
  };

  const handleSidebarChatNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingSidebarChatName(e.target.value);
  };

  const handleSidebarChatNameSave = (id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, title: editingSidebarChatName.trim() || conv.title } : conv
      )
    );
    setEditingSidebarChatId(null);
    setEditingSidebarChatName('');
  };

  const handleEditHeaderChatName = (id: string, name: string) => {
    setEditingHeaderChatId(id);
    setEditingHeaderChatName(name);
  };

  const handleHeaderChatNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingHeaderChatName(e.target.value);
  };

  const handleHeaderChatNameSave = (id: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, title: editingHeaderChatName.trim() || conv.title } : conv
      )
    );
    setEditingHeaderChatId(null);
    setEditingHeaderChatName('');
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  if (error) {
    return <div style={{ color: 'red', padding: 32 }}>Error: {error}</div>;
  }

  return (
    <div className="app-container">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onBack={handleBackToChatList}
        editingChatId={editingSidebarChatId}
        editingChatName={editingSidebarChatName}
        onEditChatName={handleEditSidebarChatName}
        onChatNameChange={handleSidebarChatNameChange}
        onChatNameSave={handleSidebarChatNameSave}
        onDeleteChat={handleDeleteConversation}
      />
      <div className="chat-main">
        {activeConversation ? (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={handleBackToChatList}>&larr; Back</button>
              {editingHeaderChatId === activeConversation.id ? (
                <input
                  className="edit-chat-name"
                  value={editingHeaderChatName}
                  onChange={handleHeaderChatNameChange}
                  onBlur={() => handleHeaderChatNameSave(activeConversation.id)}
                  onKeyDown={e => e.key === 'Enter' && handleHeaderChatNameSave(activeConversation.id)}
                  autoFocus
                />
              ) : (
                <h2 onDoubleClick={() => handleEditHeaderChatName(activeConversation.id, activeConversation.title)}>
                  {activeConversation.title}
                </h2>
              )}
            </div>
            <ChatHeaderControls
              agentMode={agentMode}
              setAgentMode={setAgentMode}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              disabled={isLoading}
            />
            <div className="messages-container">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  content={msg.content}
                  role={msg.role}
                  timestamp={msg.timestamp}
                />
              ))}
              {isLoading && (
                <div className="loading-message">Spilot is typing...</div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <ChatInput onSendMessage={sendMessage} disabled={isLoading} />
          </>
        ) : (
          <div className="chat-list-placeholder">
            <h2>Spilot Chat History</h2>
            <p>Select a chat or start a new one.</p>
          </div>
        )}
      </div>

      <style>{`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .app-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          background: #111312;
          color: #fff;
          overflow: hidden;
        }

        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #111312;
          border-radius: 0;
          margin: 0;
          box-shadow: none;
          border: none;
          overflow: hidden;
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px 0 16px 0;
          border-bottom: 1px solid #00ff90;
          background: #181a19;
          text-align: left;
        }
        .chat-header h2 {
          margin: 0 0 0 0;
          color: #00ff90;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
        }
        .back-btn {
          background: none;
          border: none;
          color: #00ff90;
          font-size: 18px;
          cursor: pointer;
          margin-left: 24px;
          margin-right: 8px;
        }
        .edit-chat-name {
          font-size: 24px;
          font-weight: 700;
          color: #00ff90;
          background: #232825;
          border: 1px solid #00ff90;
          border-radius: 4px;
          padding: 2px 8px;
        }
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 32px 0 0 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }
        .loading-message {
          color: #00ff90;
          font-style: italic;
          margin-left: 8px;
        }
        .chat-list-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .chat-list-placeholder h2 {
          color: #00ff90;
          font-size: 28px;
          margin-bottom: 8px;
        }
        .chat-list-placeholder p {
          color: #aaa;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default ChatApp; 