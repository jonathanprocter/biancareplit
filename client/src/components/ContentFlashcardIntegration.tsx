import { useEffect, useState } from 'react';

interface AnalyticsData {
  totalStudyTime: number;
  completedCards: number;
  accuracy: number;
  categoryProgress: Record<string, number>;
}

const ContentFlashcardIntegration = () => {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalStudyTime: 0,
    completedCards: 0,
    accuracy: 0,
    categoryProgress: {},
  });

  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setLoading(true);
        setInitialized(true);
        setProgress(0);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize'));
      } finally {
        setLoading(false);
      }
    };

    initializeSystem();
  }, []);

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-8 bg-white shadow-lg rounded-lg">
        <div className="p-6">
          <div className="text-center">Loading system...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 bg-white shadow-lg rounded-lg">
        <div className="p-6">
          <div className="text-red-500">
            <h3 className="font-semibold mb-2">Error Occurred</h3>
            <p>{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6 bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Study Progress</h2>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">{progress}% Complete</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="font-semibold mb-2">Study Time</h3>
          <p>{Math.floor(analytics.totalStudyTime / 60)}m</p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="font-semibold mb-2">Cards Completed</h3>
          <p>{analytics.completedCards}</p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="font-semibold mb-2">Accuracy</h3>
          <p>{Math.round(analytics.accuracy * 100)}%</p>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="font-semibold mb-2">Categories</h3>
          <p>{Object.keys(analytics.categoryProgress).length}</p>
        </div>
      </div>
    </div>
  );
};

export default ContentFlashcardIntegration;