// FileUploadNode.tsx
import { Position } from 'reactflow';
import { BaseNode } from './BaseNode';
import { useState, useCallback } from 'react';
import { useFlowStore } from '@/store/store';

interface FileUploadNodeData {
  id: string;
  nodeType: string;
  fileName?: string;
  fileContent?: string;
  fileType?: string;
}

export const FileUploadNode = ({ data }: { data: FileUploadNodeData }) => {
  const { updateNodeField } = useFlowStore();
  const [loading, setLoading] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Store file name
      updateNodeField(data.id, 'fileName', file.name);
      updateNodeField(data.id, 'fileType', file.type);

      // Read file content
      const reader = new FileReader();
     reader.onload = async (e) => {
    const content = e.target?.result as string;
    console.log("File content:", content); // Debug log
    updateNodeField(data.id, 'fileContent', content);
        };
        
        
      if (file.type === 'application/pdf') {
        // For PDFs, read as binary string
        reader.readAsBinaryString(file);
      } else {
        // For text files, read as text
        reader.readAsText(file);
      }
    } catch (error) {
      console.error('Error processing file:', error);
    } finally {
      setLoading(false);
    }
  }, [data.id, updateNodeField]);

  return (
    <BaseNode
      id={data.id}
      label="File Upload"
      outputHandles={[{ id: 'output', position: Position.Right }]}
      style={{
        background: '#ffffff',
        border: '1px solid #4CAF50',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '200px'
      }}
    >
      <div className="space-y-2">
        <input
          type="file"
          onChange={handleFileUpload}
          accept=".txt,.pdf,.doc,.docx"
          className="w-full"
        />
        {loading && (
          <div className="text-sm text-gray-500">Processing file...</div>
        )}
        {data.fileName && (
          <div className="text-sm text-gray-600">
            Uploaded: {data.fileName}
          </div>
        )}
      </div>
    </BaseNode>
  );
};