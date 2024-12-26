import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ContentFlashcardIntegration } from './components/ContentFlashcardIntegration';
import { Notifications } from './components/ui/notification/Notification';
import { Toaster } from '@/components/ui/toast';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-4">
        <ContentFlashcardIntegration />
        <Notifications />
        <Toaster />
      </div>
    </ErrorBoundary>
  );
}

export default App;