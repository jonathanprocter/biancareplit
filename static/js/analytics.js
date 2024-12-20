class AnalyticsDashboard {
  constructor() {
    this.metrics = {
      studyTime: 0,
      questionsAttempted: 0,
      correctAnswers: 0,
      flashcardsReviewed: 0,
    };
    this.sessionStart = new Date();
  }

  trackStudyTime() {
    const now = new Date();
    return Math.floor((now - this.sessionStart) / 1000);
  }

  async saveMetrics() {
    try {
      const response = await fetch('/api/save-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...this.metrics,
          totalStudyTime: this.trackStudyTime(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving metrics:', error);
      return null;
    }
  }

  updateMetrics(type, data) {
    switch (type) {
      case 'question_attempted':
        this.metrics.questionsAttempted++;
        if (data.correct) {
          this.metrics.correctAnswers++;
        }
        break;
      case 'flashcard_reviewed':
        this.metrics.flashcardsReviewed++;
        break;
      default:
        console.warn('Unknown metric type:', type);
    }
  }
}

export const initializeAnalytics = async () => {
  try {
    console.log('Initializing analytics dashboard...');
    const dashboard = new AnalyticsDashboard();

    // Set up automatic metric saving
    setInterval(() => {
      dashboard.saveMetrics().catch(console.error);
    }, 5 * 60 * 1000); // Save every 5 minutes

    console.log('Analytics dashboard initialized successfully');
    return dashboard;
  } catch (error) {
    console.error('Error initializing analytics:', error);
    throw error;
  }
};
