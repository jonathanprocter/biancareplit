
import { ToastProvider } from '@/components/ui/toast/toast-context';

function App() {
  return (
    <ToastProvider>
      <div className="w-full">
        <ContentFlashcardIntegration />
      </div>
    </ToastProvider>
  );
}

export default App;
