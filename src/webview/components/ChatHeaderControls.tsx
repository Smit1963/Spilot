import React, { useState } from 'react';

const availableModels = [
  { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek Maverick', company: 'DeepSeek', logo: <svg width="18" height="18" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#00ff90"/></svg> },
  { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick 17B', company: 'Meta', logo: <svg width="18" height="18" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#00ff90"/></svg> },
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', company: 'Meta', logo: <svg width="18" height="18" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#00ff90"/></svg> },
];

interface ChatHeaderControlsProps {
  agentMode: 'agent' | 'manual';
  setAgentMode: (mode: 'agent' | 'manual') => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const ChatHeaderControls: React.FC<ChatHeaderControlsProps> = ({
  agentMode,
  setAgentMode,
  selectedModel,
  onModelChange,
  disabled = false,
}) => {
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Get current model info
  const currentModel = availableModels.find(m => m.value === selectedModel);
  console.log(`ChatHeaderControls: Rendering with selectedModel: ${selectedModel}`);

  const handleModelChange = (modelValue: string) => {
    console.log(`ChatHeaderControls: handleModelChange called with: ${modelValue}`);
    onModelChange(modelValue);
    setShowModelDropdown(false);
  };

  return (
    <div className="chat-header-controls">
      {/* Toggle switch for agent/manual */}
      <div className="toggle-switch" title="Agent/Manual mode">
        <input
          type="checkbox"
          id="agent-toggle-header"
          checked={agentMode === 'agent'}
          onChange={() => setAgentMode(agentMode === 'agent' ? 'manual' : 'agent')}
          disabled={disabled}
        />
        <label htmlFor="agent-toggle-header">
          <span className="toggle-slider" />
          <span className="toggle-label">{agentMode === 'agent' ? 'Agent Mode' : 'Manual Mode'}</span>
        </label>
      </div>

      {/* Model select with icon */}
      <div className="model-select-modern" tabIndex={0} onBlur={() => setTimeout(() => setShowModelDropdown(false), 150)}>
        <button
          type="button"
          className="icon-btn model-btn"
          onClick={() => setShowModelDropdown(v => !v)}
          disabled={disabled}
          title={`Current: ${currentModel?.label || 'Unknown Model'}`}
        >
          {currentModel?.logo}
          <span className="model-label">{currentModel?.label || 'Unknown Model'}</span>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M6 8L10 12L14 8" stroke="#00ff90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {showModelDropdown && (
          <div className="model-dropdown">
            {availableModels.map(m => (
              <div 
                key={m.value} 
                className={`model-option ${m.value === selectedModel ? 'model-option-selected' : ''}`}
                onClick={() => {
                  console.log(`ChatHeaderControls: Clicked on model: ${m.label}`);
                  handleModelChange(m.value);
                }}
              >
                <span className="model-logo">{m.logo}</span>
                <span className="model-label">{m.label}</span>
                <span className="model-company">{m.company}</span>
                {m.value === selectedModel && (
                  <span className="model-selected-indicator">✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .chat-header-controls {
          display: flex;
          align-items: center;
          gap: 16px; /* Space between toggle and model select */
          padding: 10px 20px; /* Padding for the header controls area */
          justify-content: flex-end; /* Push to the right */
          width: 100%;
          box-sizing: border-box;
          border-bottom: 1.5px solid #00ff90; /* Add a line below the header controls */
        }
        .toggle-switch {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .toggle-switch input[type="checkbox"] {
          display: none;
        }
        .toggle-switch label {
          display: flex;
          align-items: center;
          cursor: pointer;
          position: relative;
        }
        .toggle-slider {
          width: 36px;
          height: 20px;
          background: #232825;
          border: 1.5px solid #00ff90;
          border-radius: 12px;
          position: relative;
          margin-right: 8px;
          transition: background 0.2s;
        }
        .toggle-switch input[type="checkbox"] + label .toggle-slider:before {
          content: '';
          position: absolute;
          left: 2px;
          top: 2px;
          width: 16px;
          height: 16px;
          background: #00ff90;
          border-radius: 50%;
          transition: transform 0.2s;
          transform: translateX(0);
        }
        .toggle-switch input[type="checkbox"]:checked + label .toggle-slider:before {
          transform: translateX(16px);
        }
        .toggle-label {
          font-size: 13px;
          color: #00ff90;
          font-weight: 700;
          white-space: nowrap;
        }
        .model-select-modern {
          position: relative;
          flex-shrink: 0;
          z-index: 100;
        }
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .icon-btn:hover:not(:disabled) {
          background: #00ff9020;
        }
        .model-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #00ff90;
          font-size: 14px;
          font-weight: 600;
          border: 1.5px solid #00ff90;
          border-radius: 6px;
          background: #232825;
          padding: 2px 10px 2px 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .model-label {
          margin: 0 2px 0 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .model-dropdown {
          position: absolute;
          top: 110%;
          right: 0; /* Position to the right */
          left: unset; /* Unset left to allow right positioning */
          background: #181a19;
          border: 1.5px solid #00ff90;
          border-radius: 8px;
          min-width: 180px;
          z-index: 1000;
          box-shadow: 0 4px 16px #00ff9020;
          max-height: 200px;
          overflow-y: auto;
        }
        .model-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          color: #00ff90;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .model-option:hover {
          background: #00ff9020;
        }
        .model-option-selected {
          background: #00ff9010;
          border-left: 3px solid #00ff90;
        }
        .model-logo {
          display: flex;
          align-items: center;
        }
        .model-company {
          font-size: 12px;
          color: #00ff90bb;
          margin-left: 4px;
        }
        .model-selected-indicator {
          margin-left: auto;
          color: #00ff90;
          font-size: 14px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default ChatHeaderControls; 