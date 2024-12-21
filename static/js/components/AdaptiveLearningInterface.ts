import { useEffect, useState } from 'react';

import { calculateConfidence, formatDate } from '../../lib/utils';
import { configManager } from '../config/system.config';
import { NCLEXQuestion } from '../types/study';

interface AdaptiveLearningState {
  currentQuestion: NCLEXQuestion | null;
  questionHistory: QuestionAttempt[];
  loading: boolean;
  error: string | null;
  sessionStartTime: number;
}

interface QuestionAttempt {
  questionId: string;
  timestamp: string;
  correct: boolean;
  timeSpent: number;
  confidence: number;
}

export class AdaptiveLearningSystem {
  private readonly config: typeof configManager;
  private state: AdaptiveLearningState;

  constructor() {
    this.config = configManager;
    this.state = {
      currentQuestion: null,
      questionHistory: [],
      loading: false,
      error: null,
      sessionStartTime: Date.now(),
    };
  }

  async initialize(): Promise<void> {
    try {
      this.state.loading = true;
      await this.config.initialize();

      const response = await fetch('/api/questions/next', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch initial question');
      }

      const question = await response.json();
      this.state.currentQuestion = question;
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : 'Failed to initialize';
    } finally {
      this.state.loading = false;
    }
  }

  async submitAnswer(answer: string): Promise<void> {
    try {
      if (!this.state.currentQuestion) {
        throw new Error('No active question');
      }

      const timeSpent = Math.floor(
        (Date.now() - this.state.sessionStartTime) / 1000,
      );
      const isCorrect = answer === this.state.currentQuestion.correctAnswer;

      const attempt: QuestionAttempt = {
        questionId: this.state.currentQuestion.id,
        timestamp: new Date().toISOString(),
        correct: isCorrect,
        timeSpent,
        confidence: calculateConfidence(
          timeSpent,
          isCorrect,
          this.state.currentQuestion.difficulty,
        ),
      };

      this.state.questionHistory.push(attempt);

      await this.saveAttempt(attempt);
      await this.loadNextQuestion();
    } catch (error) {
      this.state.error =
        error instanceof Error ? error.message : 'Failed to submit answer';
    }
  }

  private async saveAttempt(attempt: QuestionAttempt): Promise<void> {
    const response = await fetch('/api/attempts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attempt),
    });

    if (!response.ok) {
      throw new Error('Failed to save attempt');
    }
  }

  private async loadNextQuestion(): Promise<void> {
    const response = await fetch('/api/questions/next', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load next question');
    }

    const question = await response.json();
    this.state.currentQuestion = question;
    this.state.sessionStartTime = Date.now();
  }

  getState(): AdaptiveLearningState {
    return this.state;
  }
}

export default new AdaptiveLearningSystem();
