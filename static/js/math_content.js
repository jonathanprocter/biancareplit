// Mathematics Content Handler
class MathContentHandler {
  constructor() {
    this.currentTheorem = null;
    this.currentProblem = null;
    this.category = document.getElementById('categorySelect').value;
    this.difficulty =
      document.getElementById('difficultySelect')?.value || 'intermediate';

    // Initialize event listeners
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Category selection change
    document.getElementById('categorySelect')?.addEventListener('change', e => {
      this.category = e.target.value;
      this.loadTheorems();
    });

    // Difficulty selection change
    document
      .getElementById('difficultySelect')
      ?.addEventListener('change', e => {
        this.difficulty = e.target.value;
        this.loadPracticeProblems();
      });
  }

  async loadTheorems() {
    try {
      const response = await fetch(`/api/math/theorems/${this.category}`);
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || 'Failed to load theorems');

      this.theorems = data;
      this.displayCurrentTheorem();
    } catch (error) {
      console.error('Error loading theorems:', error);
      this.showError('Failed to load theorems. Please try again.');
    }
  }

  async loadPracticeProblems() {
    try {
      const response = await fetch(
        `/api/math/problems/${this.category}?difficulty=${this.difficulty}`
      );
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || 'Failed to load practice problems');

      this.problems = data;
      this.displayCurrentProblem();
    } catch (error) {
      console.error('Error loading practice problems:', error);
      this.showError('Failed to load practice problems. Please try again.');
    }
  }

  displayCurrentTheorem() {
    if (!this.currentTheorem && this.theorems?.length > 0) {
      this.currentTheorem = this.theorems[0];
    }

    if (this.currentTheorem) {
      const theoremContent = document.getElementById('theoremContent');
      theoremContent.innerHTML = `
                <div class="theorem-statement">
                    <h3>${this.currentTheorem.title}</h3>
                    <div class="latex-content">${
                      this.currentTheorem.formula
                    }</div>
                </div>
                <div class="proof-steps">
                    <h4>Proof:</h4>
                    ${this.currentTheorem.proof_steps
                      .map(
                        step =>
                          `<div class="proof-step latex-content">${step}</div>`
                      )
                      .join('')}
                </div>
                <div class="examples">
                    <h4>Examples:</h4>
                    ${this.currentTheorem.worked_examples
                      .map(
                        example =>
                          `<div class="example latex-content">${example}</div>`
                      )
                      .join('')}
                </div>
            `;

      // Trigger MathJax to render the new content
      if (window.MathJax) {
        MathJax.typesetPromise();
      }
    }
  }

  displayCurrentProblem() {
    if (!this.currentProblem && this.problems?.length > 0) {
      this.currentProblem = this.problems[0];
    }

    if (this.currentProblem) {
      const problemStatement = document.getElementById('problemStatement');
      const hints = document.getElementById('hints');

      problemStatement.innerHTML = `
                <div class="latex-content">${this.currentProblem.question}</div>
            `;

      hints.innerHTML = this.currentProblem.hints
        .map(hint => `<div class="hint latex-content">${hint}</div>`)
        .join('');

      // Reset work area
      document.querySelector('#workArea textarea').value = '';

      // Hide solution initially
      document.getElementById('solution').innerHTML = '';

      // Reset buttons
      document.getElementById('submitBtn').style.display = 'inline-block';
      document.getElementById('nextBtn').style.display = 'none';

      // Trigger MathJax to render the new content
      if (window.MathJax) {
        MathJax.typesetPromise();
      }
    }
  }

  showError(message) {
    // Add error display logic here
    console.error(message);
  }

  nextTheorem() {
    const currentIndex = this.theorems.indexOf(this.currentTheorem);
    if (currentIndex < this.theorems.length - 1) {
      this.currentTheorem = this.theorems[currentIndex + 1];
      this.displayCurrentTheorem();
    }
  }

  nextProblem() {
    const currentIndex = this.problems.indexOf(this.currentProblem);
    if (currentIndex < this.problems.length - 1) {
      this.currentProblem = this.problems[currentIndex + 1];
      this.displayCurrentProblem();
    }
  }

  showHint() {
    const hints = document.getElementById('hints');
    hints.style.display = 'block';
  }

  async checkSolution() {
    // Add solution checking logic here
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'inline-block';

    const solution = document.getElementById('solution');
    solution.innerHTML = `
            <h4>Solution Method:</h4>
            <div class="latex-content">${this.currentProblem.solution_method}</div>
        `;

    // Trigger MathJax to render the solution
    if (window.MathJax) {
      MathJax.typesetPromise();
    }
  }
}

// Initialize the handler when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mathContent = new MathContentHandler();
});
