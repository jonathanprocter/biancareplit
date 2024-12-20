class StudyMaterialHandler {
  constructor() {
    this.form = document.getElementById('uploadMaterialForm');
    this.resultDiv = document.getElementById('uploadResult');
    this.progressBar = this.form ? this.form.querySelector('.progress-bar') : null;
    this.uploadProgress = this.form ? this.form.querySelector('.upload-progress') : null;
    this.uploadStatus = this.form ? this.form.querySelector('.upload-status') : null;
    this.fileInput = this.form ? this.form.querySelector('#materialFile') : null;
    this.fileValidationMessage = document.getElementById('fileValidationMessage');

    if (!this.form || !this.fileInput) {
      console.error('Required upload form elements not found');
      return;
    }

    this.setupEventListeners();
    console.log('StudyMaterialHandler initialized successfully');
  }

  setupEventListeners() {
    if (this.form && this.fileInput) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      this.fileInput.addEventListener('change', (e) => this.validateFile(e));
      console.log('Upload form event listeners set up');
    }
  }

  validateFile(event) {
    const file = event.target.files[0];
    if (!file) {
      this.showError('Please select a file to upload');
      return false;
    }

    const validFileType = file.type === 'text/plain' || file.name.endsWith('.txt');
    if (!validFileType) {
      this.showError('Please upload a valid text file (.txt)');
      this.fileInput.value = '';
      return false;
    }

    // Check file size (1MB limit)
    const maxSize = 1024 * 1024; // 1MB in bytes
    if (file.size > maxSize) {
      this.showError(
        `File size exceeds the maximum limit of 1MB (current size: ${(file.size / 1024).toFixed(
          1
        )}KB)`
      );
      this.fileInput.value = '';
      return false;
    }

    this.fileValidationMessage.style.display = 'none';
    return true;
  }

  async handleSubmit(event) {
    event.preventDefault();
    console.log('Starting file upload process');

    try {
      // Validate form inputs
      const title = this.form.querySelector('#title').value.trim();
      const category = this.form.querySelector('#category').value;
      const file = this.fileInput.files[0];

      if (!title || !category || !file) {
        this.showError('Please fill in all required fields and select a file');
        return;
      }

      // Validate file before upload
      if (!this.validateFile({ target: this.fileInput })) {
        return;
      }

      this.showLoading();
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('file', file);
      formData.append('study_date', new Date().toISOString().split('T')[0]);

      console.log(`Uploading file: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      const response = await fetch('/api/study-materials/submit', {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      let result;
      let responseText;

      try {
        // First get the response text
        responseText = await response.text();
        console.log('Raw response:', responseText);

        // Try to parse as JSON regardless of content type
        try {
          result = JSON.parse(responseText);
          console.log('Parsed response:', result);
        } catch (parseError) {
          console.error('Failed to parse response as JSON:', responseText);
          throw new Error('Server returned invalid response format. Please try again.');
        }

        // Validate JSON structure
        if (!result || typeof result !== 'object') {
          console.error('Invalid response structure:', result);
          throw new Error('Invalid server response structure');
        }
      } catch (error) {
        console.error('Response processing error:', error);
        // Show both error and response for debugging
        this.showError(
          `Upload failed: ${error.message}\nResponse: ${responseText.substring(0, 100)}...`
        );
        throw error;
      }

      if (!response.ok) {
        const errorMessage = result?.error || result?.details || 'Unknown error';
        throw new Error(`Server error (${response.status}): ${errorMessage}`);
      }

      if (result.success) {
        this.showSuccess(result.message || 'Study material uploaded successfully!');
        this.form.reset();

        if (result.analysis) {
          this.showAnalysis(result.analysis);
          if (window.analyticsDashboard) {
            window.analyticsDashboard.refreshData();
          }
        }
      } else {
        throw new Error(result.error || result.details || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      this.showError(error.message || 'Failed to upload study material');
    } finally {
      this.hideLoading();
    }
  }

  showLoading() {
    if (this.uploadProgress) {
      this.uploadProgress.style.display = 'block';
      this.uploadStatus.textContent =
        'Uploading and processing study material... This may take a while for large files.';
      this.progressBar.style.width = '0%';

      // Animate progress bar
      let progress = 0;
      const interval = setInterval(() => {
        if (progress < 90) {
          progress += 5;
          this.progressBar.style.width = `${progress}%`;
        }
      }, 1000);

      // Store interval ID to clear it later
      this.progressInterval = interval;
    }
    this.resultDiv.innerHTML = '';
  }

  hideLoading() {
    if (this.uploadProgress) {
      // Clear progress animation
      if (this.progressInterval) {
        clearInterval(this.progressInterval);
        this.progressInterval = null;
      }

      // Complete progress bar
      this.progressBar.style.width = '100%';

      // Hide after a short delay to show completion
      setTimeout(() => {
        this.uploadProgress.style.display = 'none';
        this.progressBar.style.width = '0%';
      }, 500);
    }
  }

  showSuccess(message) {
    this.resultDiv.innerHTML = `
            <div class="alert alert-success" role="alert">
                <div class="d-flex justify-content-between align-items-center">
                    <span>✅ ${message}</span>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            </div>`;
  }

  showError(message) {
    this.resultDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <div class="d-flex justify-content-between align-items-center">
                    <span>❌ ${message}</span>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            </div>`;
    console.error('Upload form error:', message);
  }
  showAnalysis(analysis) {
    try {
      const parsedAnalysis = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
      console.log('Displaying analysis:', parsedAnalysis);

      const analysisHtml = `
                <div class="analysis-results mt-3">
                    <h4>Content Analysis</h4>
                    ${this.renderAnalysisSection('Topics', parsedAnalysis.topics)}
                    ${this.renderAnalysisSection('Key Points', parsedAnalysis.key_points)}
                    ${this.renderAnalysisSection(
                      'NCLEX Categories',
                      parsedAnalysis.nclex_categories
                    )}
                    ${this.renderAnalysisSection(
                      'Learning Objectives',
                      parsedAnalysis.learning_objectives
                    )}
                    <div class="mt-2">
                        <strong>Difficulty Level:</strong> ${parsedAnalysis.difficulty_level}
                    </div>
                    ${this.renderSuggestedQuestions(parsedAnalysis.suggested_questions)}
                </div>
            `;
      this.resultDiv.insertAdjacentHTML('beforeend', analysisHtml);
    } catch (error) {
      console.error('Error displaying analysis:', error);
      this.showError('Error displaying content analysis');
    }
  }

  renderAnalysisSection(title, items) {
    if (!items || items.length === 0) return '';
    return `
            <div class="mt-2">
                <strong>${title}:</strong>
                <ul class="list-unstyled">
                    ${items.map((item) => `<li>• ${item}</li>`).join('')}
                </ul>
            </div>
        `;
  }

  renderSuggestedQuestions(questions) {
    if (!questions || questions.length === 0) return '';
    return `
            <div class="suggested-questions mt-3">
                <h5>Suggested Practice Questions</h5>
                ${questions
                  .map(
                    (q, index) => `
                    <div class="question-card mt-2">
                        <p><strong>Question ${index + 1}:</strong> ${q.question}</p>
                        <ul class="options-list">
                            ${q.options
                              .map(
                                (opt, i) => `
                                <li class="${
                                  i === q.correct_answer ? 'correct-answer' : ''
                                }">${opt}</li>
                            `
                              )
                              .join('')}
                        </ul>
                        <p class="rationale"><strong>Rationale:</strong> ${q.rationale}</p>
                        <p class="category"><strong>Category:</strong> ${q.category}</p>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }
}

// Initialize handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing StudyMaterialHandler');
  window.studyMaterialHandler = new StudyMaterialHandler();
});
