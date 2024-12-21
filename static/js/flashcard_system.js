class EnhancedFlashcardSystem {
  constructor() {
    this.flashcards = [];
    this.currentIndex = 0;
    this.initialized = false;
    this.displayContainer = document.getElementById('flashcardArea');
    this.wrongAnswersDB = [];
    this.reviewMode = false;
  }

  async initialize() {
    if (this.initialized) {
      return true;
    }

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

      console.log('Loaded flashcards:', this.flashcards.length);
      this.initialized = true;
      this.render(); // Display flashcards after initialization
      return true;
    } catch (error) {
      console.error('Error initializing flashcard system:', error);
      // Fallback to local storage
      const stored = localStorage.getItem('flashcards');
      this.flashcards = stored ? JSON.parse(stored) : [];
      return false;
    }
  }

  async createCustomFlashcard(
    front,
    back,
    difficulty = 'medium',
    category = 'nursing',
    nclexCategory = null,
    keywords = [],
  ) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Clean and validate input data
      const cleanFront = front.replace(/^["']|["']$/g, '').trim();
      const cleanBack = back
        .replace(/^["']|["']$/g, '')
        .replace(/\\n/g, '\n')
        .trim();

      if (!cleanFront || !cleanBack) {
        console.error('Invalid flashcard data: Missing front or back content');
        return false;
      }

      // Check for duplicates
      const isDuplicate = this.flashcards.some(
        (card) => card.front === cleanFront || card.back === cleanBack,
      );

      if (isDuplicate) {
        console.log('Duplicate flashcard detected, skipping creation');
        return false;
      }

      // Validate and normalize NCLEX category
      const validCategories = [
        'Medical-Surgical Care',
        'Pharmacology & Medications',
        'Critical Care',
        'Emergency & Trauma',
        'Pediatric Nursing',
        'Maternal & Newborn Care',
        'Mental & Behavioral Health',
        'Community & Public Health',
        'Leadership & Management',
      ];

      const normalizedCategory =
        validCategories.find((c) =>
          category
            .toLowerCase()
            .includes(c.toLowerCase().replace(/ & | and /g, '')),
        ) || 'General Nursing';

      // Validate and normalize difficulty
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];
      const normalizedDifficulty = validDifficulties.includes(
        difficulty.toLowerCase(),
      )
        ? difficulty.toLowerCase()
        : 'intermediate';

      // Show save confirmation dialog first
      const saveConfirm = await this.showSaveConfirmation(
        cleanFront,
        cleanBack,
      );
      if (!saveConfirm || !saveConfirm.confirmed) {
        console.log('User cancelled saving flashcard');
        return false;
      }

      const flashcard = {
        id: Date.now(),
        front: cleanFront,
        back: cleanBack,
        difficulty: normalizedDifficulty,
        category: normalizedCategory,
        nclexCategory: nclexCategory || normalizedCategory,
        keywords: Array.isArray(keywords) ? keywords : [],
        tags: saveConfirm.tags || [],
        createdAt: new Date().toISOString(),
        lastReviewed: null,
        nextReview: new Date().toISOString(),
        reviewCount: 0,
        easiness: 2.5,
        interval: 1,
      };

      try {
        // Save to backend first
        const response = await fetch('/api/ai-coach/save-flashcard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(flashcard),
        });

        if (!response.ok) {
          throw new Error('Failed to save flashcard to backend');
        }

        const result = await response.json();
        if (result.flashcard_id) {
          flashcard.id = result.flashcard_id;
        }

        // Only add to local storage if backend save was successful
        console.log('Creating new flashcard:', flashcard);
        this.flashcards.push(flashcard);
        await this.saveToStorage();
        return true;
      } catch (error) {
        console.error('Error creating flashcard:', error);
        return false;
      }

      // Show save confirmation dialog
      const saveResult = await this.showSaveConfirmation(cleanFront, cleanBack);
      if (!saveResult || !saveResult.confirmed) {
        console.log('User cancelled saving flashcard');
        return false;
      }

      const tags = saveResult.tags || [];
      console.log('Saving flashcard with tags:', tags);
      flashcard.tags = saveConfirm.tags;

      // Generate AI-enhanced content and save
      try {
        const response = await fetch('/api/ai-coach/save-flashcard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: cleanFront,
            answer: cleanBack,
            difficulty: normalizedDifficulty,
            category: normalizedCategory,
            tags: [
              ...new Set([
                ...(Array.isArray(keywords) ? keywords : []),
                ...tags,
              ]),
            ],
            nclexCategory: nclexCategory,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            flashcard.id = result.flashcard_id;
            flashcard.aiEnhanced = true;
            flashcard.relatedConcepts = result.related_concepts || [];
            flashcard.studyTips = result.study_tips || [];
            flashcard.tags = result.tags || [];
          }
        }
      } catch (error) {
        console.error('Error saving flashcard:', error);
        return false;
      }

      this.render(); // Update display after adding new flashcard
      return true;
    } catch (error) {
      console.error('Error creating flashcard:', error);
      return false;
    }
  }

  async createFlashcardFromMissedQuestion(questionData) {
    try {
      const {
        question,
        correctAnswer,
        userAnswer,
        explanation,
        category,
        difficulty,
        nclexCategory,
      } = questionData;

      // Format the flashcard content
      const front = question;
      const back =
        `Correct Answer: ${correctAnswer}\n\n` +
        `Your Answer: ${userAnswer}\n\n` +
        `Explanation: ${explanation}`;

      // Add to wrong answers database for tracking
      this.wrongAnswersDB.push({
        ...questionData,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(
        'wrongAnswersDB',
        JSON.stringify(this.wrongAnswersDB),
      );

      // Create the flashcard
      return await this.createCustomFlashcard(
        front,
        back,
        difficulty,
        category,
        nclexCategory,
        questionData.keywords || [],
      );
    } catch (error) {
      console.error('Error creating flashcard from missed question:', error);
      return false;
    }
  }

  async saveToStorage() {
    try {
      await localStorage.setItem('flashcards', JSON.stringify(this.flashcards));
      console.log('Saved flashcards to storage:', this.flashcards.length);
      return true;
    } catch (error) {
      console.error('Error saving to storage:', error);
      return false;
    }
  }

  getFlashcards() {
    return this.flashcards;
  }

  getFlashcardsByCategory(category) {
    return this.flashcards.filter(
      (f) => f.category.toLowerCase() === category.toLowerCase(),
    );
  }

  render() {
    if (!this.displayContainer) {
      this.displayContainer = document.getElementById('flashcardArea');
      if (!this.displayContainer) {
        console.error('Flashcard display container not found');
        return;
      }
    }

    if (this.flashcards.length === 0) {
      this.displayContainer.innerHTML =
        '<p>No flashcards available yet. Complete some practice questions to generate flashcards!</p>';
      return;
    }

    const currentCard = this.flashcards[this.currentIndex];
    const normalizedDifficulty =
      currentCard.difficulty?.toLowerCase() || 'intermediate';

    this.displayContainer.innerHTML = `
            <div class="flashcard">
                <div class="flashcard-content">
                    <div class="flashcard-front">
                        <h3>Question</h3>
                        <p>${currentCard.front}</p>
                        ${
                          currentCard.nclexCategory
                            ? `<div class="nclex-category">${currentCard.nclexCategory}</div>`
                            : ''
                        }
                        <div class="difficulty-badge ${normalizedDifficulty}">
                            ${
                              normalizedDifficulty.charAt(0).toUpperCase() +
                              normalizedDifficulty.slice(1)
                            }
                        </div>
                    </div>
                    <div class="flashcard-back">
                        <h3>Answer</h3>
                        <p>${currentCard.back}</p>
                        ${
                          currentCard.aiEnhanced
                            ? `
                            <div class="ai-enhanced-content">
                                ${
                                  currentCard.relatedConcepts
                                    ? `
                                    <div class="related-concepts">
                                        <h4>Related Concepts:</h4>
                                        <ul>
                                            ${currentCard.relatedConcepts
                                              .map(
                                                (concept) =>
                                                  `<li>${concept}</li>`,
                                              )
                                              .join('')}
                                        </ul>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  currentCard.studyTips
                                    ? `
                                    <div class="study-tips">
                                        <h4>Study Tips:</h4>
                                        <p>${currentCard.studyTips}</p>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  currentCard.clinicalNotes
                                    ? `
                                    <div class="clinical-notes">
                                        <h4>Clinical Notes:</h4>
                                        <div class="clinical-content">
                                            ${currentCard.clinicalNotes
                                              .split('\n')
                                              .map((note) => `<p>${note}</p>`)
                                              .join('')}
                                        </div>
                                    </div>
                                `
                                    : ''
                                }
                            </div>
                        `
                            : ''
                        }
                        ${
                          currentCard.tags && currentCard.tags.length > 0
                            ? `
                            <div class="flashcard-tags">
                                <h4>Tags:</h4>
                                <ul>
                                    ${currentCard.tags.map((tag) => `<li>${tag}</li>`).join('')}
                                </ul>
                            </div>
                        `
                            : ''
                        }
                    </div>
                </div>
                <div class="flashcard-controls">
                    <button onclick="window.flashcardSystem.previousCard()">Previous</button>
                    <button onclick="window.flashcardSystem.flipCard()">Flip</button>
                    <button onclick="window.flashcardSystem.nextCard()">Next</button>
                </div>
                <div class="flashcard-info">
                    <p>Card ${this.currentIndex + 1} of ${this.flashcards.length}</p>
                    <p>Created: ${new Date(currentCard.createdAt).toLocaleDateString()}</p>
                    ${
                      currentCard.lastReviewed
                        ? `<p>Last Reviewed: ${new Date(
                            currentCard.lastReviewed,
                          ).toLocaleDateString()}</p>`
                        : '<p>Not yet reviewed</p>'
                    }
                </div>
            </div>
        `;
  }

  flipCard() {
    const card = document.querySelector('.flashcard-content');
    if (card) {
      card.classList.toggle('flipped');
    }
  }

  nextCard() {
    this.currentIndex = (this.currentIndex + 1) % this.flashcards.length;
    this.render();
  }

  previousCard() {
    this.currentIndex =
      (this.currentIndex - 1 + this.flashcards.length) % this.flashcards.length;
    this.render();
  }

  async showSaveConfirmation(front, back) {
    return new Promise((resolve) => {
      const confirmDialog = document.createElement('div');
      confirmDialog.className = 'save-confirmation-dialog';
      confirmDialog.innerHTML = `
                <div class="dialog-content">
                    <h3>Save Flashcard</h3>
                    <p>Would you like to save this flashcard?</p>
                    <div class="flashcard-preview">
                        <p><strong>Front:</strong> ${front}</p>
                        <p><strong>Back:</strong> ${back}</p>
                    </div>
                    <div class="tag-input">
                        <label for="tags">Add Tags (comma separated):</label>
                        <input type="text" id="tags" placeholder="e.g., vital signs, nursing fundamentals">
                    </div>
                    <div class="dialog-buttons">
                        <button class="btn btn-secondary" id="cancelSave">Cancel</button>
                        <button class="btn btn-primary" id="confirmSave">Save</button>
                    </div>
                </div>
            `;

      document.body.appendChild(confirmDialog);

      document.getElementById('cancelSave').addEventListener('click', () => {
        document.body.removeChild(confirmDialog);
        resolve(false);
      });

      document.getElementById('confirmSave').addEventListener('click', () => {
        const tags = document
          .getElementById('tags')
          .value.split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0);
        document.body.removeChild(confirmDialog);
        resolve({ confirmed: true, tags });
      });
    });
  }
}

// Initialize the flashcard system globally
window.flashcardSystem = new EnhancedFlashcardSystem();
