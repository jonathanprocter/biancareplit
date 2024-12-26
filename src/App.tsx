
import { Providers } from './providers/providers';
import { ContentFlashcardIntegration } from './components/ContentFlashcardIntegration';
import { ToastProvider } from './components/ui/toast/provider';

export default function App() {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50 p-4">
        <ContentFlashcardIntegration />
      </div>
    </Providers>
  );
}
