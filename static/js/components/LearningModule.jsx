import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const LearningModule = () => {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSection, setCurrentSection] = useState('content');
  const [flashcardSystem, setFlashcardSystem] = useState(null);
  const [studyCoach, setStudyCoach] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  // Initialize systems
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        setIsLoading(true);

        // Initialize the flashcard system
        const flashcardSystemInstance = new window.EnhancedFlashcardSystem();
        await flashcardSystemInstance.initialize();
        setFlashcardSystem(flashcardSystemInstance);

        // Initialize study coach
        if (window.studyCoachInterface) {
          await window.studyCoachInterface.initialize();
          setStudyCoach(window.studyCoachInterface);
        }

        // Initialize analytics
        if (window.analyticsDashboard) {
          await window.analyticsDashboard.initialize();
          setAnalyticsData(await window.analyticsDashboard.getData());
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    initializeSystems();
  }, []);

  // Handle section changes
  const handleSectionChange = (section) => {
    setCurrentSection(section);
  };

  if (error) {
    return (
      <div className="error-container p-4 bg-red-50 border border-red-200 rounded-md">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Initialization Error</h2>
        <p className="text-red-600">{error}</p>
        <Button 
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">Initializing learning systems...</p>
      </div>
    );
  }

  return (
    <div className="learning-module max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>NCLEX Study System</CardTitle>
          <div className="flex space-x-4">
            <Button
              variant={currentSection === 'content' ? 'default' : 'outline'}
              onClick={() => handleSectionChange('content')}
            >
              Study Content
            </Button>
            <Button
              variant={currentSection === 'flashcards' ? 'default' : 'outline'}
              onClick={() => handleSectionChange('flashcards')}
            >
              Flashcards
            </Button>
            <Button
              variant={currentSection === 'coach' ? 'default' : 'outline'}
              onClick={() => handleSectionChange('coach')}
            >
              AI Coach
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {currentSection === 'content' && (
            <div id="comprehensive-content" className="study-content">
              {/* Content will be dynamically loaded here */}
            </div>
          )}

          {currentSection === 'flashcards' && (
            <div id="flashcard-interface" className="flashcard-review">
              {/* Flashcard interface will be mounted here */}
            </div>
          )}

          {currentSection === 'coach' && (
            <div id="coachContainer" className="ai-coach">
              {/* AI Coach interface will be mounted here */}
            </div>
          )}
        </CardContent>
      </Card>

      {analyticsData && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Study Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={analyticsData.progress} className="mb-2" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold">Questions Completed</h3>
                <p>{analyticsData.questionsCompleted}</p>
              </div>
              <div>
                <h3 className="font-semibold">Success Rate</h3>
                <p>{analyticsData.successRate}%</p>
              </div>
              <div>
                <h3 className="font-semibold">Study Time</h3>
                <p>{analyticsData.studyTime} minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LearningModule;
