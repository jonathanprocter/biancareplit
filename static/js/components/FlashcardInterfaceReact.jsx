import React, { useState, useEffect } from 'react';

const FlashcardInterface = () => {
  const [system, setSystem] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initSystem = async () => {
      try {
        const flashcardSystem = window.flashcardSystem;
        if (flashcardSystem) {
          await flashcardSystem.initialize();
          setSystem(flashcardSystem);
        } else {
          throw new Error('Flashcard system not initialized');
        }
      } catch (error) {
        setError(error.message);
        console.error('System initialization failed:', error);
      }
    };

    initSystem();
  }, []);

  if (error) {
    return (
      <div className="error-container">
        <h2>Initialization Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!system) {
    return <div>Loading flashcard system...</div>;
  }

  return (
    <div id="flashcard-interface">
      {/* Flashcard interface components will be added here */}
      <div className="flashcard-container">
        <h2>Flashcard System</h2>
        <p>Ready to start learning</p>
      </div>
    </div>
  );
};

export default FlashcardInterface;
