import React, { useState, useEffect, createContext } from 'react';
import { createRoot } from 'react-dom/client';
import ContentFlashcardIntegration from './components/ContentFlashcardIntegration';
import { FlashcardReviewSession } from './components/FlashcardReviewSession';
import flashcardSystem from './flashcard-system';
import { StudyMaterialHandler } from './study-material-handler';
import systemIntegration, { SystemIntegration } from './SystemIntegration';
import LearningModule from './components/LearningModule';

// Use the singleton instance
const system = systemIntegration;

// Make flashcard system available globally in development
if (process.env.NODE_ENV === 'development') {
  window.flashcardSystem = flashcardSystem;
  window.system = system;
}

// Create Question Bank Context
export const QuestionBankContext = createContext(null);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500">
          <h2>Something went wrong.</h2>
          <details className="mt-2">
            <summary>Error details</summary>
            <pre className="mt-2 text-sm">{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// Main App Component
function App() {
  useEffect(() => {
    const initSystem = async () => {
      try {
        await flashcardSystem.initialize();
      } catch (error) {
        console.error('Failed to initialize flashcard system:', error);
      }
    };
    initSystem();
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <ContentFlashcardIntegration />
      </div>
    </ErrorBoundary>
  );
}

// Initialize the React application
const initializeApp = async () => {
  console.log('Initializing React application...');
  const rootElement = document.getElementById('flashcard-root');

  if (!rootElement) {
    console.error('Root element #flashcard-root not found');
    return;
  }

  try {
    // Initialize core services and middleware
    const { configManager } = await import('./config/system.config.js');
    const { initializeMiddlewareSystem } = await import('./middleware/system.middleware.js');
    const { default: SystemIntegration } = await import('./SystemIntegration.js');

    try {
      // Initialize configuration first
      await configManager.initialize();
      console.log('Configuration manager initialized successfully');

      // Initialize system integration with enhanced middleware support and fallback options
      const systemIntegration = await SystemIntegration.initialize({
        ...configManager.getConfig(),
        wsUrl: `ws://${window.location.hostname}:81/ws`,
        middleware: {
          logging: {
            enabled: true,
            level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
            format: 'json',
            fallbackToConsole: true,
          },
          performance: {
            enabled: true,
            warningThreshold: 2000,
            criticalThreshold: 5000,
            samplingRate: 0.1,
          },
          analytics: {
            enabled: true,
            realtime: false,
            updateInterval: 10000,
            batchSize: 50,
          },
          errorHandling: {
            retryAttempts: 3,
            retryDelay: 1000,
            fallbackUI: true,
          },
        },
        initialization: {
          timeout: 10000,
          retryAttempts: 3,
          parallel: false,
        },
      });

      // Add global error boundary for system integration
      window.addEventListener('unhandledrejection', (event) => {
        console.error('[SystemIntegration] Unhandled promise rejection:', event.reason);
        systemIntegration.handleError(event.reason);
      });

      console.log('System integration initialized successfully');

      // Initialize middleware system with enhanced integration
      const middleware = await initializeMiddlewareSystem(systemIntegration);

      // Register enhanced event handlers
      if (middleware.eventEmitter) {
        middleware.eventEmitter.on('performance_warning', (data) => {
          console.warn('Performance warning:', data);
          systemIntegration.handlePerformanceWarning(data);
        });

        middleware.eventEmitter.on('error', (error) => {
          console.error('Middleware error:', error);
          systemIntegration.handleError(error);
        });

        middleware.eventEmitter.on('analytics_update', (data) => {
          console.log('Analytics update received:', data);
          systemIntegration.handleAnalyticsUpdate(data);
        });
      }

      console.log('Enhanced middleware system initialized successfully');

      // Make system integration available globally in development
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        window.systemIntegration = systemIntegration;
      }

      console.log('All services initialized and configured successfully');

      // Initialize the flashcard system
      await flashcardSystem.initialize();
      console.log('Flashcard system initialized successfully');

      // Make the system available globally in development
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        window.flashcardSystem = flashcardSystem;
        //EnhancedFlashcardSystem is removed because it's not defined in the new code
      }
    } catch (error) {
      console.error('Failed to initialize systems:', error);
      throw error;
    }

    // Create and render React root
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

    console.log('React application mounted successfully');
  } catch (error) {
    console.error('Failed to initialize application:', error);
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = 'Application initialization failed. Please refresh the page.';
      errorMessage.style.display = 'block';
    }
  }
};

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
