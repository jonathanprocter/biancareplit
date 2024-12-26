
import React from 'react';
import { ContentFlashcardIntegration } from './components/ContentFlashcardIntegration';
import { Toast } from './components/ui/toast/Toast';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <ContentFlashcardIntegration />
      <Toast />
    </div>
  );
}
