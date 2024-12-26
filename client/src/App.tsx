
import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ContentFlashcardIntegration } from './components/ContentFlashcardIntegration';
import { Notifications } from './components/ui/notification/Notification';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-4">
        <ContentFlashcardIntegration />
        <Notifications />
      </div>
    </ErrorBoundary>
  );
}

export default App;
