// components/RunButton.tsx
'use client';

export const RunButton = ({ onRun }: { onRun: () => void }) => {
  return (
    <button
      onClick={onRun}
      className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors z-20"
    >
      Run Pipeline
    </button>
  );
};