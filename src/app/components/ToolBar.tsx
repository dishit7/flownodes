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
      className="bg-blue-600 text-white p-3 rounded-lg cursor-grab mb-2 text-center"
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
    <div className="p-4 bg-white border-r w-[200px] fixed left-0 top-0 h-full shadow-md">
      <h2 className="text-lg font-bold mb-4">Nodes</h2>
      <div className="space-y-2">
        <DraggableItem type="input" label="Input" />
        <DraggableItem type="output" label="Output" />
        <DraggableItem type="llm" label="LLM (Gemini)" />

      </div>
    </div>
  );
};