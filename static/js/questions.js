// Global state
const state = {
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  totalAnswered: 0,
  answerHistory: {}, // Re-added to track answers
  startTime: null, // Track when user starts a question
  sessionStartTime: Date.now(), // Track overall session duration
  studyDuration: 0, // Total study time in seconds
};

async function loadQuestions(category = 'pharmacology') {
  try {
    console.log('Loading questions for category:', category);
    const response = await fetch(`/api/nursing/questions/${category}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to load questions');
    }

    state.questions = data.questions;
    state.currentQuestionIndex = 0;
    console.log('Questions loaded:', state.questions.length);
    displayCurrentQuestion();
  } catch (error) {
    console.error('Error loading questions:', error);
    showError('Failed to load questions. Please try again.');
  }
}

function displayCurrentQuestion() {
  const container = document.getElementById('questionContainer');
  if (!container) return;

  const question = state.questions[state.currentQuestionIndex];
  if (!question) {
    container.innerHTML = '<div class="error">No questions available</div>';
    return;
  }

  // Start timing when question is displayed
  state.startTime = Date.now();

  const difficultyClass =
    {
      beginner: 'beginner',
      intermediate: 'intermediate',
      advanced: 'advanced',
    }[question.difficulty.toLowerCase()] || 'intermediate'; // Re-added difficulty display

  container.innerHTML = `
        <div class="question-card">
            <div class="question-header">
                <h3>Question ${state.currentQuestionIndex + 1} of ${
    state.questions.length
  }</h3>
                <span class="difficulty-badge ${difficultyClass}">${question.difficulty.toUpperCase()}</span> <span class="score">Score: ${
    state.score
  }/${state.totalAnswered}</span>
            </div>
            <p class="question">${question.question}</p>
            <form id="questionForm">
                ${question.options
                  .map(
                    (option, index) => `
                    <div class="option">
                        <input type="radio" name="answer" id="option${index}" value="${index}">
                        <label for="option${index}">${option}</label>
                    </div>
                `
                  )
                  .join('')}
                <button type="submit" class="submit-btn">Submit Answer</button>
            </form>
            <div class="question-actions">
                <button type="button" class="action-btn prev" onclick="previousQuestion()" ${
                  state.currentQuestionIndex === 0 ? 'disabled' : ''
                }>← Previous</button>
                <button type="button" class="action-btn next" onclick="nextQuestion()" ${
                  state.currentQuestionIndex >= state.questions.length - 1
                    ? 'disabled'
                    : ''
                }>Next →</button>
            </div>
        </div>
    `;

  const form = document.getElementById('questionForm');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
  // Show previous feedback if exists
  const questionId = question.id;
  if (questionId in state.answerHistory) {
    showStoredFeedback(questionId);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const selected = form.querySelector('input[name="answer"]:checked');

  if (!selected) {
    showError('Please select an answer');
    return;
  }

  // Calculate time taken to answer
  const timeTaken = Math.round((Date.now() - state.startTime) / 1000); // Convert to seconds
  state.studyDuration += timeTaken;

  const question = state.questions[state.currentQuestionIndex];
  if (!question) {
    showError('No question data available');
    return;
  }

  try {
    console.log('Submitting answer:', {
      questionId: question.id,
      selectedOption: selected.value,
    });

    const response = await fetch(`/api/nursing/verify-answer/${question.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selected_option: parseInt(selected.value),
        time_taken: timeTaken,
        study_duration: state.studyDuration,
      }),
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);

    if (!response.ok) {
      throw new Error(result.error || 'Server error');
    }

    // Update score and answer history
    if (!(question.id in state.answerHistory)) {
      state.totalAnswered++;
      if (result.correct) {
        state.score++;
      }
      state.answerHistory[question.id] = {
        isCorrect: result.correct,
        feedback: result,
      };
    }

    // Show feedback
    showFeedback(result);
  } catch (error) {
    console.error('Error submitting answer:', error);
    showError('Failed to submit answer. Please try again.');
  }
}

function showFeedback(result) {
  const container = document.getElementById('questionContainer');
  const feedbackDiv = document.createElement('div');
  feedbackDiv.className = `feedback ${
    result.correct ? 'correct' : 'incorrect'
  }`;
  feedbackDiv.innerHTML = `
        <h3>${result.correct ? 'Correct!' : 'Incorrect'}</h3>
        <p>Score: ${state.score}/${state.totalAnswered}</p>
        <p>Correct Answer: ${
          result.correct_answer
        }</p>  <!-- Added correct answer display -->
        <p>${result.rationale}</p>
    `;
  container.appendChild(feedbackDiv);
}

function nextQuestion() {
  if (state.currentQuestionIndex < state.questions.length - 1) {
    state.currentQuestionIndex++;
    displayCurrentQuestion();
  } else {
    showError('No more questions available');
  }
}

function previousQuestion() {
  if (state.currentQuestionIndex > 0) {
    state.currentQuestionIndex--;
    displayCurrentQuestion();
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  document.getElementById('questionContainer').appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

function showStoredFeedback(questionId) {
  const storedData = state.answerHistory[questionId];
  if (storedData && storedData.feedback) {
    showFeedback(storedData.feedback);
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadQuestions();
});
