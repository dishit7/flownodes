import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';
import { useState, useEffect } from 'react';
import { useFlowStore } from '../../../store/store';
import { useSearchParams } from 'next/navigation';

interface GmailSearchNodeData {
  id: string;
  nodeType: string;
  searchQuery: string;
  maxResults: number;
  isAuthorized?: boolean;
}

export const GmailSearchNode = ({ data }: { data: GmailSearchNodeData }) => {
  const { nodes, edges, updateNodeField } = useFlowStore();
  const searchParams = useSearchParams();
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Use authorized state from node data instead of local state
  const isAuthorized = data.isAuthorized || false;

  useEffect(() => {
    const authSuccess = searchParams.get('authSuccess');
    if (authSuccess === 'true') {
      const savedState = localStorage.getItem('flowState');
      if (savedState) {
        const { pendingAuthNodeId } = JSON.parse(savedState);
        if (data.id === pendingAuthNodeId) {
          updateNodeField(data.id, 'isAuthorized', true);
        }
      }
    }
  }, [searchParams, data.id]);

  const handleAuth = async () => {
    try {
      const nodeId = data.id;
      const response = await fetch(`http://localhost:8000/api/auth/gmail?nodeId=${nodeId}`);
      const { url } = await response.json();
      
      const flowState = {
        nodes: nodes,
        edges: edges,
        pendingAuthNodeId: nodeId
      };
      localStorage.setItem('flowState', JSON.stringify(flowState));
      
      window.location.href = url;
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleSearchQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeField(data.id, 'searchQuery', e.target.value);
  };

  const handleMaxResultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeField(data.id, 'maxResults', parseInt(e.target.value) || 5);
  };

  const handleSearch = async () => {
      if (!data.searchQuery) return;
            const nodeId = data.id;


    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/gmail/search?nodeId=${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: data.searchQuery,
          max_results: data.maxResults
        })
      });
      
      const { messages } = await response.json();
      setResults(messages);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
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
        border: '1px solid #ea4335',
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
            onChange={handleSearchQueryChange}
            placeholder="Search query (e.g., from:example@gmail.com)"
            className="w-full p-2 border rounded"
          />
          <input
            type="number"
            value={data.maxResults || 5}
            onChange={handleMaxResultsChange}
            min="1"
            max="50"
            placeholder="Max results"
            className="w-full p-2 border rounded"
          />
          <button
            onClick={handleSearch}
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Search Gmail
          </button>

          {loading && <div className="text-gray-500">Loading...</div>}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((message) => (
                <div key={message.id} className="border-b py-2">
                  <div className="font-bold">{message.subject}</div>
                  <div className="text-sm text-gray-600">{message.from}</div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-500">
            {isAuthorized && 'Gmail connected ✓'}
          </div>
        </div>
      )}
    </BaseNode>
  );
};