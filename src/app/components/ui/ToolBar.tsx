// components/Toolbar.tsx
'use client';

interface DraggableItemProps {
  type: string;
  label: string;
}

const DraggableItem = ({ type, label }: DraggableItemProps) => {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType: type }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="bg-blue-600 text-white p-3 rounded-lg cursor-grab text-center"
      onDragStart={onDragStart}
      onDragEnd={(e) => e.preventDefault()}
      draggable
    >
      {label}
    </div>
  );
};

export const Toolbar = () => {
  return (
    <div className="p-4 bg-white border-b w-full fixed top-0 left-0 shadow-md">
      <h2 className="text-lg font-bold mb-4">Nodes</h2>
      <div className="flex space-x-4 overflow-x-auto">
        <DraggableItem type="input" label="Input" />
        <DraggableItem type="output" label="Output" />
        <DraggableItem type="llm" label="LLM (Gemini)" />
        <DraggableItem type="mail-search" label="Mail Search" />
        <DraggableItem type="mail-send" label="Mail Send" />
        <DraggableItem type="file" label="File Upload" />
      </div>
    </div>
  );
};
