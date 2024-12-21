import { FlashcardSystem } from './flashcard-system.js';

const { useState, useEffect } = React;

const App = () => {
  useEffect(() => {
    const flashcardSystem = new FlashcardSystem();
    flashcardSystem.initialize();
  }, []);
  const [currentView, setCurrentView] = useState('flashcards');

  const renderView = () => {
    switch (currentView) {
      case 'flashcards':
        return <FlashcardManager />;
      case 'quiz':
        return <Quiz />;
      case 'analytics':
        return <Analytics />;
      case 'ai-chat':
        return <AIChat />;
      default:
        return <FlashcardManager />;
    }
  };

  return (
    <div className="app-container">
      <nav className="bg-blue-600 p-4">
        <ul className="flex space-x-4">
          <li>
            <button
              onClick={() => setCurrentView('flashcards')}
              className="text-white hover:bg-blue-700 px-3 py-1 rounded"
            >
              Flashcards
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('quiz')}
              className="text-white hover:bg-blue-700 px-3 py-1 rounded"
            >
              Quiz
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('analytics')}
              className="text-white hover:bg-blue-700 px-3 py-1 rounded"
            >
              Analytics
            </button>
          </li>
          <li>
            <button
              onClick={() => setCurrentView('ai-chat')}
              className="text-white hover:bg-blue-700 px-3 py-1 rounded"
            >
              AI Chat
            </button>
          </li>
        </ul>
      </nav>
      <main className="p-4">{renderView()}</main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
