import React from 'react';
import { createRoot } from 'react-dom/client';
import FlashcardManager from './components/FlashcardManager';

const container = document.getElementById('flashcard-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <FlashcardManager />
    </React.StrictMode>
  );
}
