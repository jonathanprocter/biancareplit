class AIStudyCoach {
  constructor() {
    this.context = {};
    this.currentFlashcard = null;
  }

  async askQuestion(question) {
    try {
      const response = await fetch('/api/ai-coach/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          context: this.context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI coach');
      }

      const data = await response.json();

      if (data.isFlashcard) {
        this.currentFlashcard = {
          ...data,
          suggestedDifficulty: data.suggestedDifficulty || 'INTERMEDIATE',
          suggestedTopics: data.suggestedTopics || ['nursing fundamentals'],
        };
      }

      return data;
    } catch (error) {
      console.error('Error in askQuestion:', error);
      throw error;
    }
  }

  async saveFlashcard(difficulty, tags) {
    if (!this.currentFlashcard) {
      throw new Error('No flashcard to save');
    }

    try {
      const response = await fetch('/api/flashcards/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...this.currentFlashcard,
          difficulty,
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save flashcard');
      }

      const result = await response.json();
      this.currentFlashcard = null;
      return result;
    } catch (error) {
      console.error('Error saving flashcard:', error);
      throw error;
    }
  }
}

export { AIStudyCoach };
