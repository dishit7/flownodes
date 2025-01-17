// app/page.tsx
import { FlowUI } from './components/FlowUI';
import { Toolbar } from './components/ToolBar';

export default function Home() {
  return (
    <main className="flex">
      <Toolbar />
      <div className=" flex-1">
        <FlowUI />
        
      </div>
    </main>
  );
}