// components/nodes/GmailSearchNode.tsx
import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';
import { useState } from 'react';

interface GmailSearchNodeData {
  id: string;
  nodeType: string;
  searchQuery: string;
  maxResults: number;
}

export const GmailSearchNode = ({ data }: { data: GmailSearchNodeData }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);

  const handleAuth = async () => {
    try {
      const response = await fetch('/api/auth/gmail');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  return (
    <BaseNode
      id={data.id}
      label="Gmail Search"
      inputHandles={[{ id: 'input', position: Position.Left }]}
      outputHandles={[{ id: 'output', position: Position.Right }]}
      style={{
        background: '#ffffff',
        border: '1px solid #ea4335', // Gmail red
        borderRadius: '8px',
        padding: '10px',
        minWidth: '200px'
      }}
    >
      {!isAuthorized ? (
        <button
          onClick={handleAuth}
          className="w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Connect Gmail
        </button>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={data.searchQuery || ''}
            onChange={(e) => {
              // Update node data through store
            }}
            placeholder="Search query (e.g., from:example@gmail.com)"
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            value={data.maxResults || 5}
            onChange={(e) => {
              // Update node data through store
            }}
            placeholder="Max results"
            className="w-full p-2 border rounded"
          />
        </div>
      )}
    </BaseNode>
  );
};