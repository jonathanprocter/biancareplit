import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import flashcardSystem, { FlashcardSystem } from '../flashcard-system';
import { cn } from '../../lib/utils';

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorTime: new Date().toISOString(),
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Report error to monitoring system
    window.dispatchEvent(
      new CustomEvent('flashcardSystemError', {
        detail: {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
        },
      })
    );

    console.error('FlashcardSystem Error:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
    });
  }

  handleRetry = () => {
    // Attempt to recover by reinitializing
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorTime: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="max-w-4xl mx-auto p-4">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-600">
                <h3 className="text-xl font-semibold mb-2">Error Occurred</h3>
                <p className="mb-2">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                {this.state.errorTime && (
                  <p className="text-sm text-gray-500 mb-4">
                    Error occurred at: {new Date(this.state.errorTime).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <Button className="w-full" variant="outline" onClick={this.handleRetry}>
                  Try Again
                </Button>

                <Button className="w-full" onClick={this.handleReload}>
                  Reload Page
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-600">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
                    {this.state.error?.stack}
                    <hr className="my-2" />
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

const ContentFlashcardIntegration = () => {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
    lastUpdate: null,
    averageSessionDuration: 0,
    masteryLevels: {},
  });
  const [studySlots, setStudySlots] = useState([]);
  const [progress, setProgress] = useState(0);
  const [initAttempts, setInitAttempts] = useState(0);

  const updateProgress = useCallback(
    (completedCards, accuracy = 0, categories = {}, slots = []) => {
      try {
        // Enhanced input validation with type checking
        const validCompletedCards = Math.max(0, Number(completedCards) || 0);
        const validAccuracy = Math.max(0, Math.min(1, Number(accuracy) || 0));
        const validCategories =
          typeof categories === 'object' && categories !== null
            ? Object.entries(categories).reduce(
                (acc, [key, value]) => ({
                  ...acc,
                  [key.toLowerCase()]: Math.max(0, Number(value) || 0),
                }),
                {}
              )
            : {};
        const validSlots = Array.isArray(slots)
          ? slots.filter((slot) => slot && typeof slot.id === 'number')
          : [];

        // Enhanced progress calculation considering multiple factors
        const BASE_TARGET = 20; // Base number of cards to complete
        const ACCURACY_WEIGHT = 0.3;
        const COMPLETION_WEIGHT = 0.4;
        const CATEGORY_WEIGHT = 0.2;
        const SLOT_WEIGHT = 0.1;

        // Calculate completion progress using logarithmic scale with safety check
        const completionProgress =
          validCompletedCards > 0
            ? Math.min(1, Math.log(validCompletedCards + 1) / Math.log(BASE_TARGET + 1))
            : 0;

        // Calculate category coverage with validation
        const uniqueCategories = Object.keys(validCategories).length;
        const TARGET_CATEGORIES = 5; // Minimum number of categories to cover
        const categoryProgress = Math.min(1, uniqueCategories / TARGET_CATEGORIES);

        // Calculate slot efficiency (completed slots vs total slots)
        const completedSlots = validSlots.filter((slot) => slot?.completed).length;
        const slotProgress =
          validSlots.length > 0 ? Math.min(1, completedSlots / validSlots.length) : 0;

        // Weighted average of all components with validation
        const totalProgress =
          (completionProgress * COMPLETION_WEIGHT +
            validAccuracy * ACCURACY_WEIGHT +
            categoryProgress * CATEGORY_WEIGHT +
            slotProgress * SLOT_WEIGHT) *
          100;

        // Ensure progress stays between 0-100 with rounding
        const finalProgress = Math.min(100, Math.max(0, Math.round(totalProgress)));

        // Update progress state
        setProgress(finalProgress);

        // Return calculated values for debugging
        return {
          completionProgress,
          accuracyProgress: validAccuracy,
          categoryProgress,
          slotProgress,
          finalProgress,
        };
      } catch (error) {
        console.error('Error calculating progress:', error);
        // Fallback to a simple completion-based progress
        const fallbackProgress = Math.min(
          100,
          Math.max(0, Math.round((validCompletedCards / BASE_TARGET) * 100))
        );
        setProgress(fallbackProgress);
        return { fallbackProgress };
      }
    },
    []
  );

  const initializeSystem = useCallback(
    async (retryCount = 0) => {
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000; // 2 seconds

      try {
        setLoading(true);
        setError(null);

        // Initialize flashcard system with proper validation
        if (!flashcardSystem.initialized) {
          console.log('Initializing flashcard system...');
          const initResult = await flashcardSystem.initialize().catch((err) => {
            console.error('Flashcard system initialization failed:', err);
            throw new Error(`Initialization failed: ${err.message}`);
          });

          if (!initResult?.success) {
            console.error('Initialization result:', initResult);
            throw new Error('Flashcard system failed to initialize properly');
          }
        }

        // Fetch and validate analytics data
        console.log('Fetching initial analytics...');
        const initialAnalytics = await flashcardSystem.initializeAnalytics().catch((err) => {
          console.error('Analytics initialization failed:', err);
          throw new Error(`Analytics failed: ${err.message}`);
        });

        // Validate analytics data structure
        const requiredFields = ['totalStudyTime', 'completedCards', 'accuracy', 'categoryProgress'];
        const missingFields = requiredFields.filter((field) => !(field in initialAnalytics));

        if (missingFields.length > 0) {
          console.error('Invalid analytics data - missing fields:', missingFields);
          throw new Error(`Invalid analytics data: missing ${missingFields.join(', ')}`);
        }

        // Update analytics state with validation
        setAnalytics((prevAnalytics) => ({
          ...prevAnalytics,
          totalStudyTime: Math.max(0, Number(initialAnalytics.totalStudyTime) || 0),
          completedCards: Math.max(0, Number(initialAnalytics.completedCards) || 0),
          accuracy: Math.min(1, Math.max(0, Number(initialAnalytics.accuracy) || 0)),
          categoryProgress: initialAnalytics.categoryProgress || {},
          lastUpdate: Date.now(),
        }));

        // Update progress with validated completedCards
        const validCompletedCards = Math.max(0, Number(initialAnalytics.completedCards) || 0);
        updateProgress(validCompletedCards);

        // Create and validate new study session
        console.log('Starting new study session...');
        const session = flashcardSystem.startNewSession('content');

        if (!session?.id || typeof session.id !== 'number') {
          console.error('Invalid session data:', session);
          throw new Error('Failed to create valid study session');
        }

        // Update study slots with the new validated session
        setStudySlots((prev) => {
          const validSlots = prev.filter((slot) => slot && typeof slot.id === 'number');
          return [...validSlots, session];
        });

        setInitialized(true);
        console.log('System initialized successfully with session:', session.id);
      } catch (err) {
        console.error(`Failed to initialize (attempt ${retryCount + 1}):`, err);

        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, retryCount);
          console.log(`Retrying in ${delay}ms...`);

          await new Promise((resolve) => setTimeout(resolve, delay));
          return initializeSystem(retryCount + 1);
        }

        setError(err.message || 'Failed to initialize flashcard system');
        window.dispatchEvent(
          new CustomEvent('flashcardSystemError', {
            detail: {
              error: err.message,
              timestamp: Date.now(),
              retryCount,
              component: 'ContentFlashcardIntegration',
            },
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [updateProgress]
  );

  const updateAnalytics = useCallback(async () => {
    if (!initialized) {
      console.log('Skipping analytics update - system not initialized');
      return;
    }

    try {
      // Get current slot with enhanced validation and error handling
      const currentSlot = studySlots[studySlots.length - 1];
      if (!currentSlot?.id || typeof currentSlot.id !== 'number') {
        console.warn('No valid active study slot found');
        // Create a new slot if none exists
        const newSlot = flashcardSystem.startNewSession('content');
        if (!newSlot?.id) {
          throw new Error('Failed to create new study slot');
        }
        setStudySlots((prev) => [...prev, newSlot]);
        return { status: 'new_slot_created', slotId: newSlot.id };
      }

      // Enhanced time tracking with timezone and DST handling
      const now = Date.now();
      const startTime = Number(currentSlot.startTime) || now;
      const endTime = Math.min(Number(currentSlot.endTime) || now, now);

      // Validate timestamps
      if (startTime > now || endTime > now || startTime > endTime) {
        console.error('Invalid timestamp values detected');
        return { error: 'Invalid timestamps' };
      }

      // Enhanced duration calculation with improved validation and outlier handling
      const slotDuration = Math.max(0, Math.floor((endTime - startTime) / 1000));
      const MIN_DURATION = 1; // Minimum 1 second
      const MAX_DURATION = 7200; // Cap at 2 hours to prevent outliers
      const INACTIVE_THRESHOLD = 300; // 5 minutes threshold for inactivity

      // Validate and adjust duration
      let activeTime = Math.min(Math.max(slotDuration, MIN_DURATION), MAX_DURATION);

      // Track and handle inactive periods
      const inactiveTime = slotDuration > MAX_DURATION ? slotDuration - MAX_DURATION : 0;
      if (inactiveTime > 0) {
        console.warn(`Detected inactive period: ${inactiveTime}s`);
        window.dispatchEvent(
          new CustomEvent('flashcardSystemInactivity', {
            detail: {
              duration: inactiveTime,
              timestamp: new Date().toISOString(),
              slotId: currentSlot.id,
            },
          })
        );
      }

      // Handle potential session breaks
      if (slotDuration > INACTIVE_THRESHOLD) {
        const breakDuration = slotDuration - activeTime;
        console.log(`Session break detected: ${breakDuration}s`);
        // Create a new slot if break is too long
        if (breakDuration > INACTIVE_THRESHOLD * 2) {
          const newSlot = flashcardSystem.startNewSession('content');
          setStudySlots((prev) => [...prev, newSlot]);
          return updateAnalytics(); // Recursive call with new slot
        }
      }

      // Enhanced slot validation and analysis
      const validSlots = studySlots.filter((slot) => {
        const isValid =
          slot &&
          typeof slot.duration === 'number' &&
          slot.duration > 0 &&
          slot.startTime <= slot.endTime;

        if (!isValid) {
          console.warn('Invalid slot detected:', slot);
        }
        return isValid;
      });

      // Calculate session metrics with outlier detection
      const sessionDurations = validSlots.map((slot) => slot.duration);
      const averageSessionDuration =
        sessionDurations.length > 0
          ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
          : 0;

      // Detect and handle outlier sessions
      const stdDev = Math.sqrt(
        sessionDurations.reduce(
          (sum, duration) => sum + Math.pow(duration - averageSessionDuration, 2),
          0
        ) / (sessionDurations.length || 1)
      );

      const isOutlier = Math.abs(slotDuration - averageSessionDuration) > 2 * stdDev;
      if (isOutlier) {
        console.warn('Outlier session detected:', {
          duration: slotDuration,
          average: averageSessionDuration,
          stdDev,
        });
      }

      // Prepare comprehensive analytics payload with enhanced validation
      const analyticsPayload = {
        duration: activeTime,
        category: String(currentSlot.category || 'general').toLowerCase(),
        slotId: currentSlot.id,
        completedCards: Math.max(0, Number(analytics.completedCards) || 0),
        accuracy: Math.min(1, Math.max(0, Number(analytics.accuracy) || 0)),
        categoryProgress: Object.entries(analytics.categoryProgress || {}).reduce(
          (acc, [key, value]) => {
            const normalizedKey = key.toLowerCase().trim();
            const normalizedValue = Math.max(0, Number(value) || 0);
            return normalizedKey ? { ...acc, [normalizedKey]: normalizedValue } : acc;
          },
          {}
        ),
        timestamp: now,
        metadata: {
          sessionType: currentSlot.type || 'standard',
          deviceInfo: navigator.userAgent,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          isOutlier,
          averageSessionDuration,
          inactiveTime: slotDuration - activeTime,
          validSlotCount: validSlots.length,
        },
      };

      console.log('Updating analytics with enhanced payload:', analyticsPayload);

      // Save results with improved error handling
      const updatedAnalytics = await flashcardSystem.saveResult(analyticsPayload).catch((err) => {
        console.error('Failed to save result:', err);
        throw new Error(`Analytics update failed: ${err.message}`);
      });

      // Comprehensive data validation
      if (!updatedAnalytics || typeof updatedAnalytics !== 'object') {
        throw new Error('Invalid analytics response format');
      }

      const requiredFields = ['totalStudyTime', 'completedCards', 'accuracy', 'categoryProgress'];
      const missingFields = requiredFields.filter((field) => !(field in updatedAnalytics));

      if (missingFields.length > 0) {
        throw new Error(`Missing required analytics fields: ${missingFields.join(', ')}`);
      }

      // Update analytics state with enhanced validation
      setAnalytics((prev) => {
        const normalizedCategoryProgress = Object.entries(
          updatedAnalytics.categoryProgress || {}
        ).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key.toLowerCase()]: Math.max(0, Number(value) || 0),
          }),
          {}
        );

        return {
          ...prev,
          totalStudyTime: Math.max(
            prev.totalStudyTime,
            Number(updatedAnalytics.totalStudyTime) || 0
          ),
          completedCards: Math.max(
            prev.completedCards,
            Number(updatedAnalytics.completedCards) || 0
          ),
          accuracy: Math.min(1, Math.max(0, Number(updatedAnalytics.accuracy) || 0)),
          categoryProgress: {
            ...prev.categoryProgress,
            ...normalizedCategoryProgress,
          },
          lastUpdate: now,
        };
      });

      // Update study slots with enhanced tracking
      setStudySlots((prev) =>
        prev.map((slot) => {
          if (slot.id !== currentSlot.id) return slot;

          return {
            ...slot,
            duration: slotDuration,
            lastUpdate: now,
            progress: Math.max(0, (Number(slot.progress) || 0) + 1),
            metadata: {
              ...slot.metadata,
              lastSyncTime: now,
              totalUpdates: (slot.metadata?.totalUpdates || 0) + 1,
            },
          };
        })
      );

      // Update progress with improved calculation
      const validCompletedCards = Math.max(0, Number(updatedAnalytics.completedCards) || 0);
      updateProgress(validCompletedCards);

      // Emit success event for monitoring
      window.dispatchEvent(
        new CustomEvent('flashcardSystemAnalyticsSuccess', {
          detail: {
            timestamp: now,
            slotId: currentSlot.id,
            metricsUpdated: Object.keys(analyticsPayload),
          },
        })
      );

      console.log('Analytics update completed successfully');
    } catch (err) {
      console.error('Analytics update failed:', err);

      // Enhanced error tracking
      window.dispatchEvent(
        new CustomEvent('flashcardSystemAnalyticsError', {
          detail: {
            error: err.message,
            timestamp: Date.now(),
            componentState: {
              initialized,
              hasActiveSlot: studySlots.length > 0,
              lastUpdate: analytics.lastUpdate,
            },
          },
        })
      );
    }
  }, [initialized, studySlots, analytics, updateProgress]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        await initializeSystem();

        // Listen for flashcard system events
        const initHandler = (event) => {
          console.log('[ContentFlashcardIntegration] System initialized:', event.detail);
        };

        const errorHandler = (event) => {
          console.error('[ContentFlashcardIntegration] System error:', event.detail);
          setError(event.detail.error);
        };

        window.addEventListener('flashcardSystemInitialized', initHandler);
        window.addEventListener('flashcardSystemError', errorHandler);

        return () => {
          window.removeEventListener('flashcardSystemInitialized', initHandler);
          window.removeEventListener('flashcardSystemError', errorHandler);
          if (initialized && flashcardSystem.initialized) {
            flashcardSystem.endCurrentSession();
          }
        };
      } catch (err) {
        console.error('[ContentFlashcardIntegration] Initialization failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [initializeSystem, initialized]);

  useEffect(() => {
    if (initialized) {
      // Update analytics every 5 minutes instead of 30 seconds to reduce server load
      const timer = setInterval(updateAnalytics, 300000);

      // Also update when component unmounts
      return () => {
        clearInterval(timer);
        updateAnalytics().catch(console.error);
      };
    }
  }, [initialized, updateAnalytics]);

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto p-4">
        <CardContent className="p-6">
          <LoadingSpinner />
          <p className="text-center mt-2">Initializing flashcard system...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto p-4">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p>{error}</p>
            <Button className="mt-4" onClick={() => initializeSystem()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Card className="max-w-4xl mx-auto p-4">
        <CardHeader>
          <CardTitle>Study Progress</CardTitle>
          <Progress value={progress} className="mt-4" />
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Study Time</h4>
              <p className="text-2xl font-bold">{Math.floor(analytics.totalStudyTime / 60)}m</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Cards Completed</h4>
              <p className="text-2xl font-bold">{analytics.completedCards}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Accuracy</h4>
              <p className="text-2xl font-bold">{Math.round(analytics.accuracy * 100)}%</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600">Categories</h4>
              <p className="text-2xl font-bold">{Object.keys(analytics.categoryProgress).length}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-gray-600">Study Sessions</h4>
            {studySlots.map((slot) => (
              <div
                key={slot.id}
                className={`flex justify-between items-center p-3 rounded-lg border ${
                  slot.id === studySlots[studySlots.length - 1]?.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      slot.id === studySlots[studySlots.length - 1]?.id
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-gray-400'
                    }`}
                  />
                  <span className="font-medium">Study Session</span>
                </div>
                <span className="text-sm text-gray-600">
                  {Math.floor(slot.duration / 60)}m {slot.duration % 60}s
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default ContentFlashcardIntegration;
