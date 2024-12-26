import { Toaster } from 'sonner';

import ContentFlashcardIntegration from './components/ContentFlashcardIntegration';

function App() {
  return (
    <div className="w-full">
      <ContentFlashcardIntegration />
      <Toaster />
    </div>
  );
}

export default App;
