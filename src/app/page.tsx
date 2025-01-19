// app/page.tsx
import { FlowUI } from './components/ui/FlowUI';
import { Toolbar } from './components/ui/ToolBar';

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