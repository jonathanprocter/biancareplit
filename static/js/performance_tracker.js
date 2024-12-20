class PerformanceTracker {
  constructor() {
    this.todayStats = null;
    this.initialize();
  }

  async initialize() {
    await this.loadDailySummary();
    this.setupEventListeners();
    this.render();
  }

  async loadDailySummary() {
    try {
      const response = await fetch('/api/analytics/daily-summary');
      if (response.ok) {
        const data = await response.json();
        this.todayStats = data;
        this.updateUI();
      }
    } catch (error) {
      console.error('Error loading daily summary:', error);
    }
  }

  setupEventListeners() {
    document.addEventListener('questionAnswered', async (event) => {
      const { questionId, isCorrect, timeTaken, category } = event.detail;
      await this.trackPerformance(questionId, isCorrect, timeTaken, category);
    });
  }

  async trackPerformance(questionId, isCorrect, timeTaken, category) {
    try {
      const response = await fetch('/api/performance/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question_id: questionId,
          is_correct: isCorrect,
          time_taken: timeTaken,
          category: category,
        }),
      });

      if (response.ok) {
        await this.loadDailySummary();
      }
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  }

  updateUI() {
    const summaryContainer = document.getElementById('dailySummary');
    if (!summaryContainer || !this.todayStats) return;

    const accuracy = this.todayStats.accuracyRate || 0;
    const questionsAttempted = this.todayStats.questionsAttempted || 0;
    const studyTime = this.todayStats.studyTime || 0;
    const topicsMastered = this.todayStats.topicsMastered || [];

    summaryContainer.innerHTML = `
            <div class="daily-stats">
                <h3>Today's Progress</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${questionsAttempted}</span>
                        <span class="stat-label">Questions Attempted</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${accuracy.toFixed(1)}%</span>
                        <span class="stat-label">Accuracy Rate</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${studyTime}</span>
                        <span class="stat-label">Minutes Studied</span>
                    </div>
                </div>
                ${
                  topicsMastered.length > 0
                    ? `
                    <div class="mastered-topics">
                        <h4>Topics Mastered Today</h4>
                        <ul>
                            ${topicsMastered.map((topic) => `<li>${topic}</li>`).join('')}
                        </ul>
                    </div>
                `
                    : ''
                }
                <div class="recommendations">
                    ${this.todayStats.recommendations
                      .map(
                        (rec) => `
                        <div class="recommendation-item">${rec}</div>
                    `,
                      )
                      .join('')}
                </div>
            </div>
        `;
  }
}

// Initialize the performance tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.performanceTracker = new PerformanceTracker();
});
