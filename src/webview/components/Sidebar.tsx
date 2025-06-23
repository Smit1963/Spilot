import React from 'react';

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onBack: () => void;
  editingChatId: string | null;
  editingChatName: string;
  onEditChatName: (id: string, name: string) => void;
  onChatNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChatNameSave: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onBack,
  editingChatId,
  editingChatName,
  onEditChatName,
  onChatNameChange,
  onChatNameSave,
  onDeleteChat,
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Spilot Chat</h2>
        <button 
          className="new-chat-button"
          onClick={onNewConversation}
        >
          New Chat
        </button>
      </div>
      
      <div className="conversations-list">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
            onClick={() => onSelectConversation(conv.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {editingChatId === conv.id ? (
                <input
                  className="edit-chat-name-inline"
                  value={editingChatName}
                  onChange={onChatNameChange}
                  onBlur={() => onChatNameSave(conv.id)}
                  onKeyDown={e => e.key === 'Enter' && onChatNameSave(conv.id)}
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="conversation-title">
                  {conv.title}
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  className="edit-chat-btn"
                  title="Rename chat"
                  onClick={e => {
                    e.stopPropagation();
                    onEditChatName(conv.id, conv.title);
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.232 5.232L14.768 4.768C14.077 4.077 12.923 4.077 12.232 4.768L5 12V15H8L15.232 7.768C15.923 7.077 15.923 5.923 15.232 5.232Z" stroke="#00ff90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className="delete-chat-btn"
                  title="Delete chat"
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteChat(conv.id);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 8V15M10 8V15M14 8V15M3 5H17M8 5V3H12V5" stroke="#00ff90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <span className="conversation-time">
              {conv.timestamp.toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button className="settings-button">
          Settings
        </button>
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: #181a19;
          border-right: 1px solid #00ff90;
          display: flex;
          flex-direction: column;
          box-shadow: none;
          border-radius: 0;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 32px 0 16px 32px;
          border-bottom: 1px solid #222;
          background: #181a19;
        }

        .sidebar-header h2 {
          margin: 0;
          color: #00ff90;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .new-chat-button {
          width: 90%;
          margin: 32px auto 0 auto;
          padding: 14px 0;
          background: #00ff90;
          color: #181a19;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 18px;
          font-weight: 600;
          box-shadow: none;
          transition: background 0.2s, color 0.2s;
        }

        .new-chat-button:hover {
          background: #00e67c;
        }

        .conversations-list {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0 0 0;
          background: #181a19;
          margin: 0;
          border-radius: 0;
          border: none;
        }

        .conversation-item {
          padding: 12px 32px;
          margin-bottom: 8px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          background: transparent;
          border: none;
          transition: background 0.2s;
        }

        .conversation-item:hover {
          background: #232825;
        }

        .conversation-item.active {
          background: #232825;
          color: #00ff90;
        }

        .conversation-title {
          font-size: 16px;
          margin-bottom: 2px;
          font-weight: 600;
          color: #fff;
        }

        .conversation-item.active .conversation-title {
          color: #00ff90;
        }

        .conversation-time {
          font-size: 12px;
          color: #00ff90bb;
        }

        .conversation-item.active .conversation-time {
          color: #00ff90;
        }

        .sidebar-footer {
          padding: 16px 0 0 0;
          border-top: 1px solid #222;
          background: #181a19;
        }

        .settings-button {
          width: 90%;
          margin: 0 auto;
          padding: 12px 0;
          background: transparent;
          color: #00ff90;
          border: 1px solid #00ff90;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          box-shadow: none;
          transition: background 0.2s, color 0.2s;
        }

        .settings-button:hover {
          background: #00ff9020;
        }

        .sidebar-header .back-btn {
          background: none;
          border: none;
          color: #00ff90;
          font-size: 16px;
          cursor: pointer;
          margin-top: 12px;
        }

        .edit-chat-name {
          /* legacy, replaced by .edit-chat-name-inline */
        }

        .edit-chat-name-inline {
          font-size: 16px;
          font-weight: 600;
          color: #00ff90;
          background: #232825;
          border: 1px solid #00ff90;
          border-radius: 4px;
          padding: 0 4px;
          height: 24px;
          min-width: 40px;
          max-width: 140px;
          outline: none;
          margin-bottom: 2px;
          box-sizing: border-box;
          transition: border 0.2s;
        }

        .edit-chat-name-inline:focus {
          border-color: #00ff90;
        }

        .edit-chat-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          margin-left: 4px;
          padding: 2px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          opacity: 0.6;
          transition: background 0.2s, opacity 0.2s;
        }

        .edit-chat-btn:hover {
          background: #00ff9020;
          opacity: 1;
        }

        .edit-chat-btn svg {
          display: block;
        }

        .delete-chat-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          margin-left: 8px;
          padding: 2px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .delete-chat-btn:hover {
          background: #00ff9020;
        }

        .delete-chat-btn svg {
          display: block;
        }
      `}</style>
    </div>
  );
};

export default Sidebar; 