import { ToastProvider } from '@/components/ui/toast/toast-context';
import { Toaster } from '@/components/ui/toast'; // Assuming this import is needed


function App() {
  return (
    <ToastProvider>
      <div className="w-full">
        <ContentFlashcardIntegration />
      </div>
    <Toaster />
    </ToastProvider>
  );
}

export default App;