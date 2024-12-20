import OpenAI from 'openai';

// Define NCLEX categories and difficulty levels
export const NCLEX_CATEGORIES = {
  SAFE_EFFECTIVE_CARE: 'Safe and Effective Care Environment',
  HEALTH_PROMOTION: 'Health Promotion and Maintenance',
  PSYCHOSOCIAL: 'Psychosocial Integrity',
  PHYSIOLOGICAL: 'Physiological Integrity',
};

export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
};

// Question class to structure each question
class NCLEXQuestion {
  constructor(data) {
    this.id = data.id || crypto.randomUUID();
    this.question = data.question;
    this.options = data.options;
    this.correctAnswer = data.correctAnswer;
    this.explanation = data.explanation;
    this.category = data.category;
    this.subcategory = data.subcategory;
    this.difficulty = data.difficulty;
    this.topic = data.topic;
    this.isAIGenerated = data.isAIGenerated || false;
    this.createdAt = data.createdAt || new Date();
  }
}

export class NCLEXQuestionBank {
  constructor() {
    this.openai = null;
    this.questions = new Map();
    this.initialized = false;
  }

  async initialize() {
    try {
      // Initialize OpenAI client
      const response = await fetch('/api/openai-key');
      const { apiKey } = await response.json();
      this.openai = new OpenAI({ apiKey });
      await this.initializeBaseQuestions();
      this.initialized = true;
      console.log('NCLEX Question Bank initialized successfully');
    } catch (error) {
      console.error('Failed to initialize NCLEX Question Bank:', error);
      throw error;
    }
  }

  async initializeBaseQuestions() {
    try {
      // Load pre-written questions for each category and difficulty
      for (const category of Object.values(NCLEX_CATEGORIES)) {
        for (const difficulty of Object.values(DIFFICULTY_LEVELS)) {
          const baseQuestions = await this.loadBaseQuestions(
            category,
            difficulty
          );
          baseQuestions.forEach(q => this.addQuestion(new NCLEXQuestion(q)));
        }
      }
      console.log('Base questions initialized successfully');
    } catch (error) {
      console.error('Error initializing base questions:', error);
      throw error;
    }
  }

  async loadBaseQuestions(category, difficulty) {
    try {
      const response = await fetch(
        `/api/questions?category=${category}&difficulty=${difficulty}`
      );
      return await response.json();
    } catch (error) {
      console.error(
        `Error loading base questions for ${category} - ${difficulty}:`,
        error
      );
      return [];
    }
  }

  addQuestion(question) {
    this.questions.set(question.id, question);
  }

  getQuestions(category, difficulty) {
    return Array.from(this.questions.values()).filter(
      q => q.category === category && q.difficulty === difficulty
    );
  }

  async generateNewQuestions(topic, difficulty, count = 1) {
    try {
      const prompt = this.constructPrompt(topic, difficulty);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert NCLEX question writer. Create challenging but fair questions that test nursing knowledge accurately.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const newQuestions = this.parseAIResponse(
        response.choices[0].message.content
      );
      newQuestions.forEach(q => {
        q.isAIGenerated = true;
        this.addQuestion(new NCLEXQuestion(q));
      });

      return newQuestions;
    } catch (error) {
      console.error('Error generating new questions:', error);
      throw error;
    }
  }

  constructPrompt(topic, difficulty) {
    return `Create ${difficulty} level NCLEX-style questions about ${topic}. 
                For each question, provide:
                1. The question text
                2. Four possible answers
                3. The correct answer
                4. A detailed explanation
                5. The specific NCLEX category and subcategory
                Format the response as a JSON array.`;
  }

  parseAIResponse(response) {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return [];
    }
  }

  getQuestionAnalytics() {
    return {
      totalQuestions: this.questions.size,
      questionsByCategory: this.getQuestionDistribution('category'),
      questionsByDifficulty: this.getQuestionDistribution('difficulty'),
      aiGeneratedCount: Array.from(this.questions.values()).filter(
        q => q.isAIGenerated
      ).length,
    };
  }

  getQuestionDistribution(field) {
    return Array.from(this.questions.values()).reduce((acc, q) => {
      acc[q[field]] = (acc[q[field]] || 0) + 1;
      return acc;
    }, {});
  }
}

export class QuestionGeneratorUI {
  constructor(questionBank) {
    this.questionBank = questionBank;
    this.container = null;
    this.initialize();
  }

  initialize() {
    this.container = document.createElement('div');
    this.container.className = 'question-generator-container';
    this.setupUI();
    document.body.appendChild(this.container);
  }

  setupUI() {
    // Create topic selection
    const topicInput = document.createElement('input');
    topicInput.type = 'text';
    topicInput.placeholder = 'Enter specific topic';
    topicInput.className = 'topic-input';

    // Create difficulty selection
    const difficultySelect = document.createElement('select');
    difficultySelect.className = 'difficulty-select';
    Object.values(DIFFICULTY_LEVELS).forEach(level => {
      const option = document.createElement('option');
      option.value = level;
      option.textContent = level.charAt(0).toUpperCase() + level.slice(1);
      difficultySelect.appendChild(option);
    });

    // Create generate button
    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate New Questions';
    generateButton.className = 'generate-button';
    generateButton.onclick = async () => {
      try {
        generateButton.disabled = true;
        generateButton.textContent = 'Generating...';
        const newQuestions = await this.questionBank.generateNewQuestions(
          topicInput.value,
          difficultySelect.value
        );
        this.displayNewQuestions(newQuestions);
      } catch (error) {
        console.error('Error generating questions:', error);
        alert('Failed to generate new questions. Please try again.');
      } finally {
        generateButton.disabled = false;
        generateButton.textContent = 'Generate New Questions';
      }
    };

    // Append elements to container
    this.container.appendChild(topicInput);
    this.container.appendChild(difficultySelect);
    this.container.appendChild(generateButton);
  }

  displayNewQuestions(questions) {
    const questionsContainer = document.createElement('div');
    questionsContainer.className = 'new-questions-container';

    questions.forEach(question => {
      const questionElement = document.createElement('div');
      questionElement.className = 'question-card';
      questionElement.innerHTML = `
                <h3>${question.question}</h3>
                <ul>
                    ${question.options.map(opt => `<li>${opt}</li>`).join('')}
                </ul>
                <p><strong>Category:</strong> ${question.category}</p>
                <p><strong>Difficulty:</strong> ${question.difficulty}</p>
                <p><strong>Explanation:</strong> ${question.explanation}</p>
            `;
      questionsContainer.appendChild(questionElement);
    });

    // Remove previous questions container if it exists
    const existingContainer = this.container.querySelector(
      '.new-questions-container'
    );
    if (existingContainer) {
      existingContainer.remove();
    }

    this.container.appendChild(questionsContainer);
  }
}
