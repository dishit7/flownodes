import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';
import ReactMarkdown from 'react-markdown';

interface OutputNodeData {
  id: string;
  nodeType: string;
  value: string;
}

export const OutputNode = ({ data }: { data: OutputNodeData }) => {
  // Calculate width based on the length of the content
  const contentLength = data.value?.length || 0;
  const dynamicWidth = contentLength > 1000 ? 'w-[500px]' : contentLength > 500 ? 'w-[400px]' : 'w-[300px]';

  return (
    <BaseNode
      id={data.id}
      label="Output"
      inputHandles={[{ id: 'input', position: Position.Left }]}
      style={{ background: '#ffffff', border: '1px solid #ccc', borderRadius: '8px', padding: '10px' }}
      childrenStyle={{
        minHeight: '50px',
        maxHeight: '300px',
      }}
    >
      <div className={`p-2 bg-gray-50 rounded ${dynamicWidth} overflow-x-auto`}>
        {data.value ? (
          <ReactMarkdown>{data.value}</ReactMarkdown> // Render Markdown here
        ) : (
          'Output will appear here...'
        )}
      </div>
    </BaseNode>
  );
};
