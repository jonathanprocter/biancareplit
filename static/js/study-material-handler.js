export class StudyMaterialHandler {
  constructor() {
    this.initialized = false;
    this.uploadForm = null;
    this.studySlots = [];
    this.currentSlot = null;
    this.analyticsData = {
      totalStudyTime: 0,
      completedCards: 0,
      accuracy: 0,
      categoryProgress: {},
      lastUpdate: null,
    };
  }

  async initialize() {
    try {
      if (this.initialized) {
        console.log('[StudyMaterialHandler] Already initialized');
        return true;
      }

      console.log('[StudyMaterialHandler] Starting initialization...');

      // Emit initialization event
      window.dispatchEvent(
        new CustomEvent('studyMaterialHandlerInitializing', {
          detail: { timestamp: Date.now() },
        })
      );

      // Health check with improved error handling
      console.log('[StudyMaterialHandler] Checking API health...');
      const healthCheck = await fetch('/api/health').catch((error) => {
        console.error('[StudyMaterialHandler] Health check failed:', error);
        throw new Error('API health check failed');
      });

      if (!healthCheck.ok) {
        const errorData = await healthCheck.json().catch(() => ({}));
        throw new Error(
          `API health check failed: ${healthCheck.status} ${errorData.message || ''}`
        );
      }

      // System status verification
      console.log('[StudyMaterialHandler] Verifying system status...');
      const statusResponse = await fetch('/api/system/status').catch((error) => {
        console.error('[StudyMaterialHandler] Status check failed:', error);
        throw new Error('Failed to verify system status');
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json().catch(() => ({}));
        throw new Error(
          `System status check failed: ${statusResponse.status} ${errorData.message || ''}`
        );
      }

      // Load study slots with retry logic
      console.log('[StudyMaterialHandler] Loading study slots...');
      const maxRetries = 3;
      let lastError = null;

      for (let i = 0; i < maxRetries; i++) {
        try {
          await this.loadStudySlots();
          console.log('[StudyMaterialHandler] Study slots loaded successfully');
          break;
        } catch (error) {
          console.warn(
            `[StudyMaterialHandler] Attempt ${i + 1}/${maxRetries} to load study slots failed:`,
            error
          );
          lastError = error;
          if (i === maxRetries - 1) {
            throw new Error(
              `Failed to load study slots after ${maxRetries} attempts: ${error.message}`
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        }
      }

      // Set up form handlers
      this.uploadForm = document.getElementById('material-upload-form');
      if (this.uploadForm) {
        this.uploadForm.addEventListener('submit', this.handleUpload.bind(this));
        console.log('[StudyMaterialHandler] Upload form handlers initialized');
      }

      this.initialized = true;
      console.log('[StudyMaterialHandler] Initialization completed successfully');
      return true;
    } catch (error) {
      console.error('[StudyMaterialHandler] Initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  async loadStudySlots() {
    try {
      const response = await fetch('/api/study-slots');
      if (!response.ok) {
        throw new Error('Failed to load study slots');
      }

      const slots = await response.json();
      this.studySlots = Array.isArray(slots) ? slots : [];
      return this.studySlots;
    } catch (error) {
      console.error('Error loading study slots:', error);
      throw error;
    }
  }

  async createStudySlot(type = 'flashcards') {
    try {
      const response = await fetch('/api/study-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          startTime: Date.now(),
          duration: 0,
          completed: false,
          cardsReviewed: 0,
          correctAnswers: 0,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create study slot');
      }

      const newSlot = await response.json();
      this.currentSlot = newSlot;
      this.studySlots.push(newSlot);
      return newSlot;
    } catch (error) {
      console.error('Error creating study slot:', error);
      throw error;
    }
  }

  async handleUpload(event) {
    event.preventDefault();

    try {
      const formData = new FormData(event.target);
      const response = await fetch('/api/study-materials/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  async updateAnalytics(sessionData) {
    if (!sessionData) return;

    try {
      const response = await fetch('/api/analytics/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error('Failed to update analytics');
      }

      const updatedAnalytics = await response.json();
      this.analyticsData = {
        ...this.analyticsData,
        ...updatedAnalytics,
        lastUpdate: Date.now(),
      };

      return this.analyticsData;
    } catch (error) {
      console.error('Error updating analytics:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const studyMaterialHandler = new StudyMaterialHandler();
