// SendMailNode.tsx
import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';
import { useState, useEffect } from 'react';
import { useFlowStore } from '../../../store/store';

interface SendMailNodeData {
  id: string;
  nodeType: string;
  to: string;
  subject: string;
  body: string;
  isAuthorized?: boolean;
  value:string
}

export const SendMailNode = ({ data }: { data: SendMailNodeData }) => {
  const { updateNodeField, setNodes, setEdges } = useFlowStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const isAuthorized = data.isAuthorized || false;

  useEffect(() => {
    const savedState = localStorage.getItem('flowState');
    if (savedState) {
      const { nodes, edges } = JSON.parse(savedState);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [setNodes, setEdges]);

  const handleAuth = async () => {
    try {
      const nodeId = data.id;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/gmail?nodeId=${nodeId}`);
      const { url } = await response.json();

      const flowState = {
        nodes: useFlowStore.getState().nodes,
        edges: useFlowStore.getState().edges,
        pendingAuthNodeId: nodeId,
      };
      localStorage.setItem('flowState', JSON.stringify(flowState));

      window.location.href = url;
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleSendMail = async () => {
      if (!data.to || !data.subject || !data.value) {
      console.log(`data.to is ${data.to} data.subject is ${data.subject} data.body is ${data.body} and data value is${data.value}`)
      setStatus('Please fill all fields');
      return;
    }
    setLoading(true);
    setStatus('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/gmail/send?nodeId=${data.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.to,
          subject: data.subject,
          body: data.value,
        }),
      });

      if (response.ok) {
        setStatus('Email sent successfully!');
      } else {
        const error = await response.json();
        setStatus(`Error: ${error.detail}`);
      }
    } catch (error) {
      setStatus('Failed to send email');
      console.error('Send error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseNode
      id={data.id}
      label="Send Email"
      inputHandles={[{ id: 'input', position: Position.Left }]}
      outputHandles={[{ id: 'output', position: Position.Right }]}
      style={{
        background: '#ffffff',
        border: '1px solid #ea4335',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '250px',
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
            type="email"
            value={data.to || ''}
            onChange={(e) => updateNodeField(data.id, 'to', e.target.value)}
            placeholder="To email address"
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            value={data.subject || ''}
            onChange={(e) => updateNodeField(data.id, 'subject', e.target.value)}
            placeholder="Subject"
            className="w-full p-2 border rounded"
          />
<textarea
    value={data.value || data.body || ''} // Add data.value here
    onChange={(e) => updateNodeField(data.id, 'body', e.target.value)}
    placeholder="Email body"
    rows={4}
    className="w-full p-2 border rounded"
/>
          <button
            onClick={handleSendMail}
            disabled={loading}
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Sending...' : 'Send Email'}
          </button>

          {status && (
            <div className={`text-sm ${status.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
              {status}
            </div>
          )}

          <div className="text-xs text-gray-500">{isAuthorized && 'Gmail connected ✓'}</div>
        </div>
      )}
    </BaseNode>
  );
};
