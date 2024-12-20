class EnhancedFlashcardSystem {
  constructor() {
    this.flashcards = [];
    this.currentCard = 0;
    this.wrongAnswersDB = [];
    this.reviewMode = false;
  }

  async initialize() {
    await this.loadFlashcards();
    this.filterDueCards();
    this.render();
  }

  async loadFlashcards() {
    try {
      // Load from API first
      const response = await fetch('/api/flashcards');
      if (response.ok) {
        const data = await response.json();
        this.flashcards = data.flashcards;
      } else {
        // Fallback to local storage if API fails
        const stored = localStorage.getItem('flashcards');
        this.flashcards = stored ? JSON.parse(stored) : [];
      }

      const storedWrong = localStorage.getItem('wrongAnswersDB');
      this.wrongAnswersDB = storedWrong ? JSON.parse(storedWrong) : [];

      // Get AI recommendations for study focus
      await this.getAIRecommendations();
    } catch (error) {
      console.error('Error loading flashcards:', error);
      // Fallback to local storage
      const stored = localStorage.getItem('flashcards');
      this.flashcards = stored ? JSON.parse(stored) : [];
    }
  }

  async getAIRecommendations() {
    try {
      const response = await fetch('/api/ai/study-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcards: this.flashcards,
          wrongAnswers: this.wrongAnswersDB,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.updateStudyPlan(data.recommendations);
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }
  }

  filterDueCards() {
    if (!this.reviewMode) return;
    const now = new Date();
    this.flashcards = this.flashcards.filter((card) => {
      return !card.nextReview || new Date(card.nextReview) <= now;
    });

    // Sort by priority (based on AI recommendations)
    this.flashcards.sort((a, b) => {
      return (b.priority || 0) - (a.priority || 0);
    });
  }

  saveFlashcards() {
    localStorage.setItem('flashcards', JSON.stringify(this.flashcards));
  }

  async addWrongAnswer(question, userAnswer, correctAnswer, explanation, category, difficulty) {
    const wrongAnswer = {
      id: Date.now(),
      question,
      userAnswer,
      correctAnswer,
      explanation,
      category,
      difficulty,
      timestamp: new Date().toISOString(),
    };

    this.wrongAnswersDB.push(wrongAnswer);
    localStorage.setItem('wrongAnswersDB', JSON.stringify(this.wrongAnswersDB));

    // Generate AI-enhanced flashcard
    await this.createAIEnhancedFlashcard(wrongAnswer);

    // Update study recommendations
    await this.getAIRecommendations();
  }

  async createAIEnhancedFlashcard(wrongAnswer) {
    try {
      const response = await fetch('/api/ai/generate-flashcard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          missed_question: wrongAnswer,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const flashcard = {
          id: Date.now(),
          front: data.front,
          back: data.back,
          category: wrongAnswer.category,
          difficulty: wrongAnswer.difficulty,
          lastReviewed: null,
          nextReview: new Date().toISOString(),
          repetitions: 0,
          easiness: 2.5,
          interval: 1,
          relatedConcepts: data.related_concepts,
        };

        this.flashcards.push(flashcard);
        this.saveFlashcards();
        this.render();
      }
    } catch (error) {
      console.error('Error generating AI flashcard:', error);
      // Fallback to basic flashcard creation
      this.createFlashcardFromWrongAnswer(wrongAnswer);
    }
  }

  calculateNextReview(quality, card) {
    // SuperMemo-2 Algorithm implementation
    let easiness = card.easiness || 2.5;
    const repetitions = card.repetitions || 0;

    // Update easiness factor
    easiness = Math.max(1.3, easiness + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Calculate interval
    let interval;
    if (quality < 3) {
      interval = 1; // Review again tomorrow
    } else if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(card.interval * easiness);
    }

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);

    return {
      nextReview: nextDate.toISOString(),
      easiness,
      interval,
      repetitions: quality >= 3 ? repetitions + 1 : 0,
    };
  }

  createFlashcardFromWrongAnswer(wrongAnswer) {
    const flashcard = {
      id: Date.now(),
      front: wrongAnswer.question,
      back: `Correct Answer: ${wrongAnswer.correctAnswer}\n\nExplanation: ${wrongAnswer.explanation}`,
      lastReviewed: null,
      nextReview: new Date().toISOString(),
      difficulty: 'hard',
      repetitions: 0,
      easiness: 2.5,
      interval: 1,
    };

    this.flashcards.push(flashcard);
    this.saveFlashcards();
    this.render();
  }

  async createCustomFlashcard(front, back, difficulty = 'medium') {
    const flashcard = {
      id: Date.now(),
      front,
      back,
      lastReviewed: null,
      nextReview: new Date().toISOString(),
      difficulty,
      repetitions: 0,
      easiness: 2.5,
      interval: 1,
    };

    this.flashcards.push(flashcard);
    this.saveFlashcards();
    this.render();
  }

  rateCard(quality) {
    const card = this.flashcards[this.currentCard];
    const review = this.calculateNextReview(quality, card);

    // Update card with new spaced repetition data
    card.lastReviewed = new Date().toISOString();
    card.nextReview = review.nextReview;
    card.easiness = review.easiness;
    card.interval = review.interval;
    card.repetitions = review.repetitions;

    // Update difficulty based on quality rating
    if (quality <= 2) card.difficulty = 'hard';
    else if (quality <= 4) card.difficulty = 'medium';
    else card.difficulty = 'easy';

    this.saveFlashcards();
    this.nextCard();
  }

  startReview() {
    this.reviewMode = true;
    this.filterDueCards();
    if (this.flashcards.length === 0) {
      alert('No cards due for review! Check back later.');
      this.reviewMode = false;
      this.loadFlashcards();
    }
    this.currentCard = 0;
    this.render();
  }

  exitReview() {
    this.reviewMode = false;
    this.loadFlashcards();
    this.render();
  }
  render() {
    const container = document.getElementById('flashcardArea');
    if (!container) return;

    container.innerHTML = '';
    if (this.flashcards.length === 0) {
      container.innerHTML =
        '<p>No flashcards available. Create some mathematical concepts or review practice problems to generate them automatically!</p>';
      return;
    }

    const card = this.flashcards[this.currentCard];
    const nextReview = new Date(card.nextReview);
    const now = new Date();
    const daysUntilReview = Math.ceil((nextReview - now) / (1000 * 60 * 60 * 24));

    container.innerHTML = `
            <div class="flashcard">
                <div class="flashcard-content">
                    <div class="flashcard-front">${card.front}</div>
                    <div class="flashcard-back">${card.back}</div>
                </div>
                <div class="flashcard-controls">
                    <button class="btn btn-secondary" onclick="flashcardSystem.prevCard()">Previous</button>
                    <button class="btn btn-primary" onclick="flashcardSystem.flipCard()">Flip</button>
                    <button class="btn btn-secondary" onclick="flashcardSystem.nextCard()">Next</button>
                </div>
                ${
                  this.reviewMode
                    ? `
                    <div class="review-controls mt-3">
                        <p>Rate your understanding:</p>
                        <div class="btn-group">
                            <button class="btn btn-outline-danger" onclick="flashcardSystem.rateCard(1)">Hard (1)</button>
                            <button class="btn btn-outline-warning" onclick="flashcardSystem.rateCard(3)">Good (3)</button>
                            <button class="btn btn-outline-success" onclick="flashcardSystem.rateCard(5)">Easy (5)</button>
                        </div>
                    </div>
                `
                    : ''
                }
                <div class="flashcard-stats">
                    <span class="difficulty-indicator difficulty-${card.difficulty.toLowerCase()}">
                        ${card.difficulty}
                    </span>
                    <small class="text-muted">
                        ${
                          card.lastReviewed
                            ? `Last reviewed: ${new Date(card.lastReviewed).toLocaleDateString()}`
                            : 'Not reviewed yet'
                        }
                        ${
                          daysUntilReview > 0
                            ? `• Next review in ${daysUntilReview} day${
                                daysUntilReview === 1 ? '' : 's'
                              }`
                            : '• Due for review'
                        }
                    </small>
                </div>
            </div>
        `;

    // Trigger MathJax to process the new content
    if (window.MathJax) {
      MathJax.typesetPromise([container]);
    }
  }

  flipCard() {
    const card = document.querySelector('.flashcard-content');
    card.classList.toggle('flipped');
  }

  nextCard() {
    this.currentCard = (this.currentCard + 1) % this.flashcards.length;
    this.render();
  }

  prevCard() {
    this.currentCard = (this.currentCard - 1 + this.flashcards.length) % this.flashcards.length;
    this.render();
  }
}
