class AIStudyCoach {
  constructor() {
    this.currentFlashcard = null;
    this.flashcardSystem = window.flashcardSystem || new EnhancedFlashcardSystem();
  }

  async askQuestion(question) {
    try {
      const response = await fetch('/api/ai-coach/flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: question }),
      });

      const data = await response.json();

      // Extract content features for suggestions
      const contentKeywords = data.question.toLowerCase();
      let suggestedDifficulty = 'INTERMEDIATE';
      let suggestedTopics = ['nursing fundamentals'];

      // Determine difficulty based on content complexity
      if (
        contentKeywords.includes('advanced') ||
        contentKeywords.includes('complex') ||
        contentKeywords.includes('analyze') ||
        contentKeywords.includes('evaluate')
      ) {
        suggestedDifficulty = 'ADVANCED';
      } else if (
        contentKeywords.includes('basic') ||
        contentKeywords.includes('identify') ||
        contentKeywords.includes('list') ||
        contentKeywords.includes('define')
      ) {
        suggestedDifficulty = 'BEGINNER';
      }

      // Extract topics from content
      const nursingTopics = {
        pharmacology: ['medication', 'drug', 'dosage', 'administration'],
        medical_surgical: ['assessment', 'intervention', 'care plan', 'condition'],
        pediatric: ['child', 'pediatric', 'development', 'growth'],
        maternal_newborn: ['pregnancy', 'labor', 'newborn', 'maternal'],
        mental_health: ['psychiatric', 'mental', 'behavioral', 'therapy'],
        community_health: ['community', 'public health', 'prevention', 'education'],
        leadership: ['management', 'leadership', 'delegation', 'supervision'],
      };

      suggestedTopics = Object.entries(nursingTopics)
        .filter(([category, keywords]) =>
          keywords.some((keyword) => contentKeywords.includes(keyword)),
        )
        .map(([category]) => category);

      if (suggestedTopics.length === 0) {
        suggestedTopics = ['nursing fundamentals'];
      }

      this.currentFlashcard = {
        ...data,
        suggestedDifficulty,
        suggestedTopics,
      };

      return {
        content: `Study Topic: ${question}\n\nQuestion: ${data.question}\n\nAnswer: ${data.answer}`,
        isFlashcard: true,
        question: data.question,
        answer: data.answer,
        suggestedDifficulty,
        suggestedTopics,
      };
    } catch (error) {
      console.error('Error:', error);
      return {
        content: 'Sorry, I encountered an error. Please try again.',
        isFlashcard: false,
      };
    }
  }

  async saveFlashcard(difficulty, tags) {
    try {
      // Create flashcard in the enhanced system
      const flashcard = {
        id: Date.now(),
        front: this.currentFlashcard.question,
        back: this.currentFlashcard.answer,
        difficulty: difficulty,
        category: tags[0] || 'general',
        tags: tags,
        lastReviewed: null,
        nextReview: new Date().toISOString(),
        repetitions: 0,
        easiness: 2.5,
        interval: 1,
      };

      // Add to flashcard system
      await this.flashcardSystem.createCustomFlashcard(
        flashcard.front,
        flashcard.back,
        flashcard.difficulty,
        flashcard.category,
        flashcard.tags,
      );

      // Save to backend
      const response = await fetch('/api/ai-coach/save-flashcard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...flashcard,
          ...this.currentFlashcard,
        }),
      });

      const result = await response.json();

      // Trigger dashboard update
      if (window.analyticsDashboard) {
        window.analyticsDashboard.initialize();
      }

      return {
        success: true,
        id: result.id,
        collection: 'Flashcards > ' + (tags[0] || 'General'),
        difficulty: difficulty,
        tags: tags,
      };
    } catch (error) {
      console.error('Error saving flashcard:', error);
      return { success: false, error: error.message };
    }
  }
}

class StudyCoachInterface {
  constructor() {
    this.aiCoach = new AIStudyCoach();
  }

  initialize() {
    const container = document.getElementById('coachContainer');
    if (!container) return;

    container.innerHTML = `
            <div class="chat-interface">
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-message assistant-message">
                        Hello! I'm your AI study coach. How can I help you prepare for the NCLEX exam today?
                    </div>
                </div>
                <div class="chat-input">
                    <textarea id="userInput" placeholder="Ask a question..." rows="2"></textarea>
                    <button id="sendBtn" class="btn btn-primary">Send</button>
                </div>
            </div>
        `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const sendBtn = document.getElementById('sendBtn');
    const userInput = document.getElementById('userInput');

    if (sendBtn) {
      sendBtn.onclick = () => this.sendMessage();
    }

    if (userInput) {
      userInput.onkeypress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      };
    }
  }

  addMessageToChat(role, message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (typeof message === 'object') {
      contentDiv.textContent = message.content;
      messageDiv.appendChild(contentDiv);

      if (message.isFlashcard) {
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'message-buttons';
        buttonsDiv.innerHTML = `
                    <div class="flashcard-form">
                        <div class="form-group">
                            <label>Difficulty Level:</label>
                            <select id="difficulty" class="form-control">
                                <option value="BEGINNER">Beginner</option>
                                <option value="INTERMEDIATE">Intermediate</option>
                                <option value="ADVANCED">Advanced</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Topics (comma-separated):</label>
                            <input type="text" id="tags" class="form-control" 
                                   placeholder="e.g., pharmacology, vital signs">
                        </div>
                        <div class="button-group">
                            <button onclick="window.studyCoach.saveFlashcard()">Save</button>
                            <button onclick="window.studyCoach.skipFlashcard()">Skip</button>
                        </div>
                    </div>
                `;
        messageDiv.appendChild(buttonsDiv);
      }
    } else {
      contentDiv.textContent = message;
      messageDiv.appendChild(contentDiv);
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async sendMessage() {
    const userInput = document.getElementById('userInput');
    if (!userInput || !userInput.value.trim()) return;

    const question = userInput.value.trim();
    userInput.value = '';

    this.addMessageToChat('user', question);
    const response = await this.aiCoach.askQuestion(question);
    this.addMessageToChat('assistant', response);
  }

  async saveFlashcard() {
    const difficultySelect = document.getElementById('difficulty');
    const tagsInput = document.getElementById('tags');

    const difficulty = difficultySelect?.value || 'INTERMEDIATE';
    const tags =
      tagsInput?.value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean) || [];

    const result = await this.aiCoach.saveFlashcard(difficulty, tags);

    if (result.success) {
      this.addMessageToChat(
        'assistant',
        `Flashcard saved successfully!\n` +
          `Location: ${result.collection}\n` +
          `Difficulty: ${difficulty}\n` +
          `Topics: ${tags.join(', ')}`,
      );
    } else {
      this.addMessageToChat('assistant', 'Failed to save flashcard. Please try again.');
    }
  }

  skipFlashcard() {
    this.addMessageToChat('assistant', 'Flashcard skipped. Ask another question!');
  }
}

// Initialize on page load
window.onload = () => {
  window.studyCoach = new StudyCoachInterface();
  window.studyCoach.initialize();
};
