// Initialize Chart.js for analytics
const Chart = window.Chart;

class StudyTimer {
    constructor() {
        try {
            // Core timing state
            this.sessionStart = Date.now();
            this.questionStart = Date.now();
            this.activeTime = 0;
            this.questionTime = 0;
            this.isActive = true;
            this.lastUpdateTime = Date.now();
            this.displayInterval = null;
            
            // Initialize display element
            this.displayElement = document.getElementById('studyTimeDisplay');
            if (!this.displayElement) {
                console.warn('Study time display element not found');
            }
            
            // Start display updates
            this.startDisplayUpdates();
            
            console.log('Study timer initialized:', {
                sessionStart: new Date(this.sessionStart).toISOString(),
                isActive: this.isActive,
                displayElement: !!this.displayElement
            });
        } catch (error) {
            console.error('Error initializing StudyTimer:', error);
            // Don't throw, just log the error
            this.initializeFallback();
        }
    }

    initializeFallback() {
        // Fallback initialization with basic functionality
        this.sessionStart = Date.now();
        this.questionStart = Date.now();
        this.activeTime = 0;
        this.questionTime = 0;
        this.isActive = true;
        console.warn('Using fallback timer initialization');
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.pause();
        } else {
            this.resume();
        }
    }

    pause() {
        if (this.isActive) {
            this.isActive = false;
            this.updateTimers();
            console.log('Timer paused:', this.getDebugState());
        }
    }

    resume() {
        if (!this.isActive) {
            this.isActive = true;
            this.sessionStart = Date.now() - this.activeTime * 1000;
            this.questionStart = Date.now() - this.questionTime * 1000;
            console.log('Timer resumed:', this.getDebugState());
        }
    }

    startDisplayUpdates() {
        if (this.displayInterval) {
            clearInterval(this.displayInterval);
        }
        this.displayInterval = setInterval(() => {
            this.updateTimers();
            this.updateDisplay();
        }, 1000);
        return this.displayInterval;
    }

    updateTimers() {
        if (this.isActive) {
            this.activeTime = Math.floor((Date.now() - this.sessionStart) / 1000);
            this.questionTime = Math.floor((Date.now() - this.questionStart) / 1000);
        }
    }

    updateDisplay() {
        if (this.displayElement) {
            const hours = Math.floor(this.activeTime / 3600);
            const minutes = Math.floor((this.activeTime % 3600) / 60);
            const seconds = this.activeTime % 60;
            this.displayElement.textContent = 
                `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    startNewQuestion() {
        this.questionStart = Date.now();
        this.questionTime = 0;
        console.log('New question started:', this.getDebugState());
    }

    getTiming() {
        this.updateTimers();
        console.log('Getting timing:', this.getDebugState());
        
        return {
            time_taken: this.questionTime || 1, // Ensure at least 1 second
            study_duration: this.activeTime || 1
        };
    }

    getDebugState() {
        return {
            sessionStart: new Date(this.sessionStart).toISOString(),
            questionStart: new Date(this.questionStart).toISOString(),
            activeTime: this.activeTime,
            questionTime: this.questionTime,
            isActive: this.isActive,
            currentTime: new Date().toISOString()
        };
    }

    destroy() {
        if (this.displayInterval) {
            clearInterval(this.displayInterval);
        }
    }
}

class NursingContentHandler {
    constructor() {
        this.category = 'pharmacology';
        this.questions = [];
        this.currentQuestion = null;
        this.currentIndex = 0;
        this.selectedDifficulty = null;
        this.incorrectAnswers = [];
        this.initialized = false;
        this.timer = null;
        
        // Initialize study timer
        this.initializeTimer();
        
        // Simple initialization when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
        
        console.log('NursingContentHandler constructed');
        
        try {
            // Setup window event listeners for timer management
            window.addEventListener('beforeunload', () => this.cleanup());
            window.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
            console.log('NursingContentHandler initialized with timer');
        } catch (error) {
            console.error('Error in NursingContentHandler constructor:', error);
            this.showNotification('Error initializing study system', 'error');
        }
    }

    initializeTimer() {
        try {
            this.timer = new StudyTimer();
            console.log('Study timer initialized');
        } catch (error) {
            console.error('Failed to initialize timer:', error);
            this.showNotification('Failed to initialize study timer', 'error');
        }
    }

    cleanup() {
        try {
            if (this.timer) {
                this.timer.destroy();
            }
            // Remove all event listeners
            document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            window.removeEventListener('blur', this.handleWindowBlur);
            window.removeEventListener('focus', this.handleWindowFocus);
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    initialize() {
        if (this.initialized) return;
        
        try {
            this.initialized = true;

            // Bind event handlers
            this.handleVisibilityChange = () => {
                console.log('Visibility changed:', document.hidden);
                if (this.timer) {
                    if (document.hidden) {
                        this.timer.pause();
                    } else {
                        this.timer.resume();
                    }
                }
            };

            this.handleWindowBlur = () => {
                console.log('Window blur event');
                if (this.timer) this.timer.pause();
            };

            this.handleWindowFocus = () => {
                console.log('Window focus event');
                if (this.timer) this.timer.resume();
            };

            // Add event listeners
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
            window.addEventListener('blur', this.handleWindowBlur);
            window.addEventListener('focus', this.handleWindowFocus);

            this.loadQuestions();
            console.log('NursingContentHandler initialized successfully');
            
        } catch (error) {
            console.error('Error during initialization:', error);
            this.cleanup();
        }
    }

    async loadQuestions(category = null) {
        try {
            const loadingNotification = this.showNotification('Loading questions...', 'info');
            console.log('Loading questions for category:', category || this.category);
            
            category = category || this.category;
            const result = await questionService.getQuestions(category, 5);
            
            if (result.success) {
                this.questions = result.questions.filter(q => 
                    q && q.question && 
                    Array.isArray(q.options) && 
                    q.options.length > 0 &&
                    typeof q.correct === 'number'
                );
                
                // Remove loading notification
                loadingNotification.remove();
                
                
            } else {
                throw new Error(result.error || 'Failed to load questions');
            }
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showError(`Failed to load questions: ${error.message}`);
            // Clear current question if load fails
            this.questions = [];
            this.currentQuestion = null;
            this.displayCurrentQuestion();
        }
        if (this.questions.length === 0) {
            this.showError('No questions found for the selected category. Please try another category.');
            return;
        }
        
        this.currentIndex = 0;
        this.currentQuestion = this.questions[0];
        
        // Start timing for first question
        if (this.timer) {
            this.timer.startNewQuestion();
        }
        
        this.displayCurrentQuestion();
        console.log('Successfully loaded questions:', this.questions.length);
    }

    displayCurrentQuestion() {
        try {
            const container = document.getElementById('questionContainer');
            if (!container) {
                console.error('Question container not found');
                return;
            }
            
            if (!this.currentQuestion) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-content">
                            <h3>No Questions Available</h3>
                            <p>There are no questions available for the selected category and difficulty level.</p>
                            <p>Try selecting a different category or difficulty level.</p>
                        </div>
                    </div>`;
                return;
            }

            // Start timing for new question
            if (this.timer) {
                this.timer.startNewQuestion();
            }

            // Ensure difficulty is lowercase for consistent CSS class mapping
            const difficulty = (this.currentQuestion.difficulty || 'intermediate').toLowerCase();
            const difficultyClass = {
                'beginner': 'beginner',
                'intermediate': 'intermediate',
                'advanced': 'advanced'
            }[difficulty] || 'intermediate';

            // Parse options if they're stored as a JSON string
            const options = Array.isArray(this.currentQuestion.options) ? 
                this.currentQuestion.options : 
                JSON.parse(this.currentQuestion.options);

            container.innerHTML = `
                <div class="question-card">
                    <div class="question-header">
                        <div class="question-meta">
                            <h3>Question ${this.currentIndex + 1} of ${this.questions.length}</h3>
                            <span class="category-label">${this.currentQuestion.category}</span>
                        </div>
                        <span class="difficulty-badge ${difficultyClass}">
                            ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </span>
                    </div>
                    
                    <div class="question-content">
                        <p class="question-text">${this.currentQuestion.question}</p>
                        
                        <form id="questionForm" class="options-form">
                            ${options.map((option, index) => `
                                <div class="option-container">
                                    <input type="radio" name="answer" 
                                        id="option${index}" 
                                        value="${index}" 
                                        class="option-input">
                                    <label class="option-label" for="option${index}">
                                        <span class="option-marker">${String.fromCharCode(65 + index)}.</span>
                                        <span class="option-text">${option}</span>
                                    </label>
                                </div>
                            `).join('')}
                        </form>
                    </div>

                    <div class="question-actions">
                        <button class="action-btn prev" 
                            onclick="nursingContent.previousQuestion()"
                            ${this.currentIndex === 0 ? 'disabled' : ''}>
                            ← Previous
                        </button>
                        <button class="action-btn submit" onclick="nursingContent.submitAnswer()">
                            Submit Answer
                        </button>
                        <button class="action-btn next"
                            onclick="nursingContent.nextQuestion()"
                            ${this.currentIndex >= this.questions.length - 1 ? 'disabled' : ''}>
                            Next →
                        </button>
                    </div>
                </div>`;
        } catch (error) {
            console.error('Error displaying question:', error);
            this.showError('Failed to display question. Please try refreshing the page.');
        }
    }

    async submitAnswer() {
        try {
            const form = document.getElementById('questionForm');
            if (!form) {
                throw new Error('Question form not found');
            }

            const selected = form.querySelector('input[name="answer"]:checked');
            if (!selected) {
                this.showError('Please select an answer before submitting.');
                return;
            }

            if (!this.currentQuestion || !this.currentQuestion.id) {
                throw new Error('Invalid question data');
            }

            // Get timing data from the timer
            const timing = this.timer ? this.timer.getTiming() : { 
                time_taken: 60, 
                study_duration: 60 
            };

            // Prepare request data with actual timing
            const requestData = {
                selected_option: parseInt(selected.value),
                time_taken: timing.time_taken,
                study_duration: timing.study_duration
            };

            console.log('Submitting answer:', {
                questionId: this.currentQuestion.id,
                timing: timing,
                requestData: requestData
            });

            const response = await fetch(`/api/nursing/verify-answer/${this.currentQuestion.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}`);
            }

            const result = await response.json();
            
            // If answer is incorrect, create a flashcard with enhanced metadata
            if (!result.correct && window.flashcardSystem) {
                try {
                    const flashcardData = {
                        front: this.currentQuestion.question,
                        back: `Correct Answer: ${this.currentQuestion.options[result.correct_answer]}\n\nRationale: ${result.rationale}`,
                        category: this.currentQuestion.category,
                        difficulty: this.currentQuestion.difficulty,
                        nclexCategory: this.currentQuestion.nclex_category || 'Pharmacology',
                        keywords: this.currentQuestion.keywords || [],
                        aiEnhanced: true,
                        relatedConcepts: this.currentQuestion.related_concepts || [],
                        studyTips: result.study_tips || 'Focus on understanding the underlying concepts and rationale.'
                    };
                    
                    // Create flashcard with enhanced metadata
                    await window.flashcardSystem.createCustomFlashcard(
                        flashcardData.front,
                        flashcardData.back,
                        flashcardData.difficulty,
                        flashcardData.category,
                        flashcardData.nclexCategory,
                        flashcardData.keywords,
                        flashcardData.aiEnhanced,
                        flashcardData.relatedConcepts,
                        flashcardData.studyTips
                    );
                    console.log('Created enhanced flashcard from missed question:', flashcardData);
                } catch (error) {
                    console.error('Error creating flashcard from missed question:', error);
                }
            }
            
            const feedback = document.getElementById('answerFeedback');
            if (feedback) {
                feedback.style.display = 'block';
                feedback.innerHTML = `
                    <div class="feedback-card ${result.correct ? 'feedback-success' : 'feedback-error'}">
                        <div class="feedback-header">
                            <h3>${result.correct ? '✓ Correct!' : '✗ Incorrect'}</h3>
                        </div>
                        <div class="feedback-content">
                            <p><strong>Your Answer:</strong> Option ${String.fromCharCode(65 + parseInt(requestData.selected_option))}</p>
                            <p><strong>Correct Answer:</strong> Option ${String.fromCharCode(65 + result.correct_answer)}</p>
                            <p><strong>Explanation:</strong> ${result.rationale}</p>
                        </div>
                    </div>`;
            }

        } catch (error) {
            console.error('Error submitting answer:', error);
            this.showError('Failed to submit answer. Please try again.');
        }
    }

    previousQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.currentQuestion = this.questions[this.currentIndex];
            this.displayCurrentQuestion();
            const feedback = document.getElementById('answerFeedback');
            if (feedback) {
                feedback.style.display = 'none';
            }
        }
    }

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.currentQuestion = this.questions[this.currentIndex];
            this.displayCurrentQuestion();
            const feedback = document.getElementById('answerFeedback');
            if (feedback) {
                feedback.style.display = 'none';
            }
        }
    }

    showNotification(message, type = 'error') {
        try {
            // Remove existing notifications of the same type
            const existingNotifications = document.querySelectorAll(`.notification-${type}`);
            existingNotifications.forEach(notification => notification.remove());
            
            const notificationDiv = document.createElement('div');
            notificationDiv.className = `notification-${type} fixed p-4 rounded-lg shadow-lg z-50 transition-all duration-300 flex items-center`;
            
            // Position notifications based on type
            switch (type) {
                case 'error':
                    notificationDiv.classList.add('top-4', 'right-4', 'bg-red-100', 'border-l-4', 'border-red-500', 'text-red-700');
                    break;
                case 'success':
                    notificationDiv.classList.add('top-4', 'right-4', 'bg-green-100', 'border-l-4', 'border-green-500', 'text-green-700');
                    break;
                case 'info':
                    notificationDiv.classList.add('top-4', 'right-4', 'bg-blue-100', 'border-l-4', 'border-blue-500', 'text-blue-700');
                    break;
                case 'warning':
                    notificationDiv.classList.add('top-4', 'right-4', 'bg-yellow-100', 'border-l-4', 'border-yellow-500', 'text-yellow-700');
                    break;
            }
            
            // Define icons for different notification types
            const icons = {
                error: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
                info: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
                success: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
                warning: '<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            };
            
            switch (type) {
                case 'error':
                    notificationDiv.className = `${baseClasses} bg-red-100 border-l-4 border-red-500 text-red-700`;
                    break;
                case 'info':
                    notificationDiv.className = `${baseClasses} bg-blue-100 border-l-4 border-blue-500 text-blue-700`;
                    break;
                case 'success':
                    notificationDiv.className = `${baseClasses} bg-green-100 border-l-4 border-green-500 text-green-700`;
                    break;
                default:
                    notificationDiv.className = `${baseClasses} bg-gray-100 border-l-4 border-gray-500 text-gray-700`;
            }
            
            // Add icon and message
            notificationDiv.innerHTML = `
                ${icons[type] || ''}
                <div class="flex flex-col">
                    <div class="font-semibold">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div class="text-sm">${message}</div>
                </div>
                <button onclick="this.parentElement.remove()" class="ml-4 text-gray-500 hover:text-gray-700">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            `;
            
            // Remove existing notifications of the same type
            document.querySelectorAll(`.${type}-notification`).forEach(el => el.remove());
            
            // Add to DOM with animation
            notificationDiv.style.opacity = '0';
            notificationDiv.style.transform = 'translateX(100%)';
            document.body.appendChild(notificationDiv);
            
            // Trigger animation
            setTimeout(() => {
                notificationDiv.style.opacity = '1';
                notificationDiv.style.transform = 'translateX(0)';
            }, 100);
            
            // Auto-remove after delay
            setTimeout(() => {
                notificationDiv.style.opacity = '0';
                notificationDiv.style.transform = 'translateX(100%)';
                setTimeout(() => notificationDiv.remove(), 300);
            }, 5000);
            return notificationDiv;
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }

    filterByDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;
        this.loadQuestions();
    }

    async generateQuestions(category = 'PHARMACOLOGY', difficulty = 'BEGINNER') {
        try {
            console.log(`Generating questions for ${category} (${difficulty})`);
            
            const response = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: category.toUpperCase(),
                    difficulty: difficulty.toUpperCase(),
                    count: 25
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate questions: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Questions generated:', result);
            
            if (result.success) {
                // Reload questions after generation
                await this.loadQuestions(category);
                return true;
            } else {
                throw new Error(result.error || 'Failed to generate questions');
            }
            
        } catch (error) {
            console.error('Error generating questions:', error);
            this.showError(`Failed to generate questions: ${error.message}`);
            return false;
        }
    }

}

// Initialize the handler
try {
    window.nursingContent = new NursingContentHandler();
    console.log('NursingContent initialized globally');
} catch (error) {
    console.error('Failed to initialize NursingContent:', error);
}