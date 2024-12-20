// AIQuestionGenerator.js
class AIQuestionGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = '/api/nursing/questions';
    this.initializeEventListeners();
  }

  async generateQuestion(difficulty, topic, subtopic) {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          difficulty,
          topic,
          subtopic,
          requestType: 'NCLEX',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Generated question:', data);
      return data;
    } catch (error) {
      console.error('Error generating question:', error);
      throw error;
    }
  }

  async bulkGenerateQuestions(topics, difficulties, count = 5) {
    const generatedQuestions = [];

    for (const topic of Object.keys(topics)) {
      for (const subtopic of topics[topic]) {
        for (const difficulty of difficulties) {
          console.log(
            `Generating ${count} questions for ${topic}/${subtopic} at ${difficulty} level`,
          );

          try {
            const questions = await this.generateBatch(topic, subtopic, difficulty, count);
            generatedQuestions.push(...questions);
          } catch (error) {
            console.error(`Error generating questions for ${topic}/${subtopic}:`, error);
          }
        }
      }
    }

    return generatedQuestions;
  }

  initializeEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      const generateButton = document.querySelector('#generate-questions');
      if (generateButton) {
        generateButton.addEventListener('click', async () => {
          try {
            const topics = {
              Pharmacology: ['Administration', 'Drug Classes', 'Side Effects'],
              'Medical-Surgical': ['Cardiovascular', 'Respiratory', 'Neurological'],
              Pediatrics: ['Growth and Development', 'Common Conditions'],
              Maternal: ['Pregnancy', 'Labor', 'Postpartum'],
              Psychiatric: ['Disorders', 'Medications', 'Therapeutic Communication'],
              Fundamentals: ['Assessment', 'Basic Care', 'Safety'],
            };

            const difficulties = ['beginner', 'intermediate', 'advanced'];

            // Show loading state
            generateButton.disabled = true;
            generateButton.textContent = 'Generating Questions...';

            const questions = await this.bulkGenerateQuestions(topics, difficulties);

            // Dispatch event for NursingContentHandler
            const event = new CustomEvent('questionsGenerated', {
              detail: { questions },
            });
            document.dispatchEvent(event);

            // Reset button state
            generateButton.disabled = false;
            generateButton.textContent = 'Generate New Questions';
          } catch (error) {
            console.error('Error in bulk generation:', error);
            // Reset button state
            generateButton.disabled = false;
            generateButton.textContent = 'Generate New Questions';
          }
        });
      }
    });
  }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
  const apiKey = document.querySelector('meta[name="openai-key"]')?.content;

  if (!apiKey) {
    console.error('OpenAI API key not found in meta tags');
    return;
  }

  // Initialize our new components
  const questionGenerator = new AIQuestionGenerator(apiKey);
  window.aiQuestionGenerator = questionGenerator;

  console.log('AI Question Generator initialized successfully');
});
