import { AIStudyCoach } from './ai_study_coach';

class StudyCoachInterface {
  constructor() {
    this.aiCoach = new AIStudyCoach();
    this.initialized = false;
  }

  initializeChatInterface() {
    const container = document.getElementById('coachContainer');
    if (!container) return false;

    container.innerHTML = `
            <div class="chat-interface">
                <div class="study-tools mb-3">
                    <button class="btn btn-primary me-2" onclick="window.studyCoachInterface.createFlashcard()">
                        Create Flashcard
                    </button>
                    <button class="btn btn-primary" onclick="window.studyCoachInterface.createQuiz()">
                        Create Quiz
                    </button>
                </div>
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-message assistant-message">
                        <div class="message-content">
                            Hello! I'm your AI study coach. How can I help you prepare for the NCLEX exam today?
                        </div>
                    </div>
                </div>
                <div class="chat-input">
                    <textarea id="userInput" placeholder="Ask a question..." rows="2"></textarea>
                    <button id="sendMessageBtn" class="btn btn-primary">Send</button>
                </div>
            </div>
        `;

    this.setupEventListeners();
    return true;
  }

  setupEventListeners() {
    const sendButton = document.getElementById('sendMessageBtn');
    const userInput = document.getElementById('userInput');

    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendMessage());
    }

    if (userInput) {
      userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  addMessageToChat(role, message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (typeof message === 'object' && message !== null) {
      contentDiv.textContent =
        message.content || JSON.stringify(message, null, 2);
      messageDiv.appendChild(contentDiv);

      if (message.isFlashcard) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flashcard-actions';
        actionsDiv.innerHTML = `
                    <button class="btn btn-primary me-2" onclick="window.studyCoachInterface.showSaveDialog()">
                        Save Flashcard
                    </button>
                    <button class="btn btn-secondary" onclick="window.studyCoachInterface.skipFlashcard()">
                        Skip
                    </button>
                `;
        messageDiv.appendChild(actionsDiv);
      }
    } else {
      contentDiv.textContent = message;
      messageDiv.appendChild(contentDiv);
    }

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  createFlashcard() {
    const userInput = document.getElementById('userInput');
    if (userInput) {
      userInput.value = 'Create a flashcard about nursing fundamentals';
      this.sendMessage();
    }
  }

  createQuiz() {
    const userInput = document.getElementById('userInput');
    if (userInput) {
      userInput.value = 'Create a quiz question about patient assessment';
      this.sendMessage();
    }
  }

  async sendMessage() {
    const userInput = document.getElementById('userInput');
    if (!userInput || !userInput.value.trim()) return;

    const question = userInput.value.trim();
    userInput.value = '';

    this.addMessageToChat('user', question);

    try {
      const response = await this.aiCoach.askQuestion(question);
      this.addMessageToChat('assistant', response);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      this.addMessageToChat(
        'error',
        'Sorry, I encountered an error. Please try again.',
      );
    }
  }

  showSaveDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'save-dialog';

    // Get suggested values from current flashcard
    const suggestedDifficulty =
      this.aiCoach.currentFlashcard?.suggestedDifficulty || 'INTERMEDIATE';
    const suggestedTopics = this.aiCoach.currentFlashcard?.suggestedTopics || [
      'nursing fundamentals',
    ];

    dialog.innerHTML = `
            <div class="save-dialog-content">
                <h3>Save Flashcard</h3>
                <div class="form-group">
                    <label>Difficulty Level:</label>
                    <select id="difficultyLevel" class="form-control">
                        <option value="BEGINNER" ${
                          suggestedDifficulty === 'BEGINNER' ? 'selected' : ''
                        }>Beginner</option>
                        <option value="INTERMEDIATE" ${
                          suggestedDifficulty === 'INTERMEDIATE'
                            ? 'selected'
                            : ''
                        }>Intermediate</option>
                        <option value="ADVANCED" ${
                          suggestedDifficulty === 'ADVANCED' ? 'selected' : ''
                        }>Advanced</option>
                    </select>
                    <small class="form-text text-muted">Suggested difficulty based on content</small>
                </div>
                <div class="form-group">
                    <label>Tags (comma-separated):</label>
                    <input type="text" id="flashcardTags" class="form-control" 
                           value="${suggestedTopics.join(', ')}"
                           placeholder="e.g., vital signs, assessment">
                    <small class="form-text text-muted">Suggested topics based on content</small>
                </div>
                <div class="flashcard-actions">
                    <button class="btn btn-primary me-2" onclick="window.studyCoachInterface.saveFlashcard()">
                        Save
                    </button>
                    <button class="btn btn-secondary" onclick="window.studyCoachInterface.closeDialog()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    document.body.appendChild(dialog);
  }

  async saveFlashcard() {
    try {
      const difficulty =
        document.getElementById('difficultyLevel')?.value || 'INTERMEDIATE';
      const tags =
        document
          .getElementById('flashcardTags')
          ?.value.split(',')
          .map((tag) => tag.trim())
          .filter(Boolean) || [];

      const result = await this.aiCoach.saveFlashcard(difficulty, tags);

      if (result.success) {
        const successMessage =
          "Flashcard saved successfully!\n" +
          `Location: ${result.collection}\n` +
          `Difficulty: ${result.difficulty}\n` +
          `Topics: ${result.tags.join(', ')}`;

        this.addMessageToChat('assistant', successMessage);

        // Refresh the dashboard counts
        if (window.analyticsDashboard) {
          await window.analyticsDashboard.initialize();
        }
      } else {
        this.addMessageToChat(
          'error',
          'Failed to save flashcard. Please try again.',
        );
      }
    } catch (error) {
      console.error('Error saving flashcard:', error);
      this.addMessageToChat(
        'error',
        'Failed to save flashcard. Please try again.',
      );
    }
    this.closeDialog();
  }

  skipFlashcard() {
    this.addMessageToChat(
      'assistant',
      'Flashcard skipped. Let me know if you have any other questions!',
    );
  }

  closeDialog() {
    const dialog = document.querySelector('.save-dialog');
    if (dialog) dialog.remove();
  }

  async initialize() {
    if (this.initialized) return;

    if (!this.initializeChatInterface()) {
      console.error('Failed to initialize chat interface');
      return;
    }

    this.initialized = true;
  }
}

// Initialize the interface globally
// Initialize the interface globally
window.studyCoachInterface = new StudyCoachInterface();

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing study coach interface...');
  const coachContainer = document.getElementById('coachContainer');
  if (coachContainer) {
    try {
      window.studyCoachInterface.initialize().catch((error) => {
        console.error('Failed to initialize study coach:', error);
        coachContainer.innerHTML = `
                    <div class="error-message">
                        Failed to initialize study coach. Please try refreshing the page.
                    </div>
                `;
      });
    } catch (error) {
      console.error('Error during study coach initialization:', error);
    }
  } else {
    console.warn('Coach container not found in DOM');
  }
});

// Export for module usage
export { StudyCoachInterface };
