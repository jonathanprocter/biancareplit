import { createRoot } from 'react-dom/client';

import React from 'react';

import FlashcardManager from './components/FlashcardManager';

const container = document.getElementById('flashcard-root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <FlashcardManager />
    </React.StrictMode>,
  );
}
