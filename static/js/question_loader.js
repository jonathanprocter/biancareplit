// QuestionLoader.js
class QuestionLoader {
  constructor(baseUrl, maxRetries = 3) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.questionCache = new Map();
    this.pendingRequests = new Map();
    this.MINIMUM_QUESTIONS_THRESHOLD = 5;
    this.BATCH_SIZE = 10;
  }

  async loadQuestionsForCategory(category, retryCount = 0) {
    const cacheKey = `${category}-${new Date().toISOString().split('T')[0]}`;

    // Check cache first
    if (this.questionCache.has(cacheKey)) {
      console.log(`Returning cached questions for ${category}`);
      return this.questionCache.get(cacheKey);
    }

    // Check if there's already a pending request for this category
    if (this.pendingRequests.has(category)) {
      console.log(`Waiting for existing request for ${category}`);
      return this.pendingRequests.get(category);
    }

    // Create new request promise
    const requestPromise = this._makeRequest(category, retryCount);
    this.pendingRequests.set(category, requestPromise);

    try {
      const result = await requestPromise;
      this.questionCache.set(cacheKey, result);
      this.pendingRequests.delete(category);
      return result;
    } catch (error) {
      this.pendingRequests.delete(category);
      throw error;
    }
  }

  async _makeRequest(category, retryCount) {
    try {
      console.log(
        `Loading questions for category: ${category} (attempt ${retryCount + 1})`,
      );

      const response = await fetch(
        `${this.baseUrl}/api/nursing/questions/${category}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData, null, 2));
      }

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions received from server');
      }

      return data;
    } catch (error) {
      console.error("Failed to load questions:", error);

      if (retryCount < this.maxRetries) {
        console.log(`Retrying... (${retryCount + 1}/${this.maxRetries})`);

        // Exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));

        return this.loadQuestionsForCategory(category, retryCount + 1);
      }

      throw error;
    }
  }

  async generateAdditionalQuestions(section) {
    if (
      this.questionCache.get(section)?.length >=
      this.MINIMUM_QUESTIONS_THRESHOLD
    ) {
      return true;
    }

    try {
      console.log(`Generating additional questions for section: ${section}`);

      const response = await fetch(
        `${this.baseUrl}/api/nursing/questions/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            section: section,
            count: this.BATCH_SIZE,
            difficulty: 'mixed',
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.status}`);
      }

      const newQuestions = await response.json();

      if (newQuestions.questions && Array.isArray(newQuestions.questions)) {
        const cacheKey = `${section}-${new Date().toISOString().split('T')[0]}`;
        const currentQuestions = this.questionCache.get(cacheKey) || [];
        this.questionCache.set(cacheKey, [
          ...currentQuestions,
          ...newQuestions.questions,
        ]);

        console.log(
          `Successfully added ${newQuestions.questions.length} questions to ${section}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        `Failed to generate additional questions for ${section}:`,
        error,
      );
      showError(
        `Failed to generate questions for ${section}: ${error.message}`,
      );
      return false;
    }
  }
}

function showError(message) {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.remove('hidden');
    setTimeout(() => {
      errorContainer.classList.add('hidden');
    }, 5000);
  }
}

export const questionLoader = new QuestionLoader(window.location.origin);
