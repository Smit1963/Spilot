import React from 'react';
import ReactDOM from 'react-dom';
import { ChatInterface } from '../components/ChatInterface';

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

const vscode = window.acquireVsCodeApi();

const App: React.FC = () => {
  return (
    <div className="app-container">
      <ChatInterface />
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
); 