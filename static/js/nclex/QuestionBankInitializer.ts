import React, { useState, useEffect } from 'react';
import { createBaseQuestion } from '../utils/questionUtils';
import type { NCLEXQuestion } from '../types/study';

class NCLEXQuestionBank {
    private questions: Map<string, NCLEXQuestion>;
    private categories: Map<string, { subcategories: Set<string>; questionCount: number }>;
    private flashcards: Map<string, any>;
    private initialized: boolean;
    private adaptiveMetrics: {
        userPerformance: Map<string, {
            correctAnswers: number;
            totalAttempts: number;
            averageTime: number;
            categoryStrengths: Map<string, { correct: number; total: number }>;
        }>;
        categoryProgress: Map<string, {
            totalUsers: number;
            averagePerformance: number;
        }>;
        difficultyAdjustments: Map<string, {
            difficulty: string;
            lastUpdated: Date;
        }>;
        lastUpdate: Date | null;
    };

    constructor() {
        this.questions = new Map();
        this.categories = new Map();
        this.flashcards = new Map();
        this.initialized = false;
        this.adaptiveMetrics = {
            userPerformance: new Map(),
            categoryProgress: new Map(),
            difficultyAdjustments: new Map(),
            lastUpdate: null
        };
    }

    formatFlashcardBack(question: NCLEXQuestion): string {
        // Format the back content for the flashcard
        const correctAnswer = question.options[question.correctAnswer];
        const explanation = question.explanation;
        const keyPoints = Array.isArray(question.rationale.keyPoints) 
            ? question.rationale.keyPoints.join('\n') 
            : '';
        const relatedConcepts = Array.isArray(question.relatedConcepts) 
            ? question.relatedConcepts.join(', ') 
            : '';

        return `Correct Answer: ${correctAnswer}\n\nExplanation:\n${explanation}${
            keyPoints ? `\n\nKey Points:\n${keyPoints}` : ''
        }${relatedConcepts ? `\n\nRelated Concepts:\n${relatedConcepts}` : ''}`.trim();
    }

    createFlashcard(question: NCLEXQuestion): any | null {
        try {
            return {
                id: `FC_${question.id}`,
                front: question.question,
                back: this.formatFlashcardBack(question),
                metadata: {
                    questionId: question.id,
                    category: question.category,
                    subcategory: question.subcategory,
                    difficulty: question.difficulty,
                    topic: question.topic,
                    relatedConcepts: question.relatedConcepts || []
                },
                nextReviewDate: new Date(),
                lastReviewed: null,
                reviewCount: 0
            };
        } catch (error) {
            console.error(`Failed to create flashcard for question ${question.id}:`, error);
            return null;
        }
    }

    async updateAdaptiveMetrics(userId: string, questionId: string, isCorrect: boolean, timeTaken: number): Promise<{
        correctAnswers: number;
        totalAttempts: number;
        averageTime: number;
        categoryStrengths: Map<string, { correct: number; total: number }>;
    } | undefined> {
        try {
            const question = this.questions.get(questionId);
            if (!question) return;

            const userMetrics = this.adaptiveMetrics.userPerformance.get(userId) || {
                correctAnswers: 0,
                totalAttempts: 0,
                averageTime: 0,
                categoryStrengths: new Map()
            };

            // Update user metrics
            userMetrics.totalAttempts++;
            if (isCorrect) userMetrics.correctAnswers++;
            userMetrics.averageTime = (userMetrics.averageTime * (userMetrics.totalAttempts - 1) + timeTaken) / userMetrics.totalAttempts;

            // Update category strengths
            const categoryStrength = userMetrics.categoryStrengths.get(question.category) || {
                correct: 0,
                total: 0
            };
            categoryStrength.total++;
            if (isCorrect) categoryStrength.correct++;
            userMetrics.categoryStrengths.set(question.category, categoryStrength);

            // Store updated metrics
            this.adaptiveMetrics.userPerformance.set(userId, userMetrics);
            this.adaptiveMetrics.lastUpdate = new Date();

            // Adjust difficulty based on performance
            await this.adjustQuestionDifficulty(userId, question.category);
            
            return userMetrics;
        } catch (error) {
            console.error('Error updating adaptive metrics:', error);
            throw error;
        }
    }

    async adjustQuestionDifficulty(userId: string, category: string): Promise<string | undefined> {
        try {
            const userMetrics = this.adaptiveMetrics.userPerformance.get(userId);
            if (!userMetrics) return;

            const categoryStrength = userMetrics.categoryStrengths.get(category);
            if (!categoryStrength) return;

            const performance = categoryStrength.correct / categoryStrength.total;
            let newDifficulty;

            if (performance > 0.8) {
                newDifficulty = 'advanced';
            } else if (performance > 0.6) {
                newDifficulty = 'intermediate';
            } else {
                newDifficulty = 'beginner';
            }

            this.adaptiveMetrics.difficultyAdjustments.set(`${userId}-${category}`, {
                difficulty: newDifficulty,
                lastUpdated: new Date()
            });

            // Update category progress
            const progress = this.adaptiveMetrics.categoryProgress.get(category) || {
                totalUsers: 0,
                averagePerformance: 0
            };
            progress.totalUsers = (progress.totalUsers || 0) + 1;
            progress.averagePerformance = ((progress.averagePerformance || 0) * (progress.totalUsers - 1) + performance) / progress.totalUsers;
            this.adaptiveMetrics.categoryProgress.set(category, progress);

            return newDifficulty;
        } catch (error) {
            console.error('Error adjusting question difficulty:', error);
            throw error;
        }
    }

    async initialize() {
        try {
            console.log('Initializing NCLEX Question Bank...');
            
            // Initialize categories
            Object.entries(initialQuestionBank.categories).forEach(([category, data]) => {
                this.categories.set(category, {
                    subcategories: new Set(data.subcategories),
                    questionCount: 0
                });
            });

            // Initialize questions
            initialQuestionBank.questions.forEach(questionData => {
                const question = this.createQuestion(questionData);
                this.questions.set(question.id, question);
                
                // Update category counts
                const categoryData = this.categories.get(question.category);
                if (categoryData) {
                    categoryData.questionCount++;
                    this.categories.set(question.category, categoryData);
                }
                
                // Create flashcard for each question
                const flashcard = this.createFlashcard(question);
                if (flashcard) {
                    this.flashcards.set(flashcard.id, flashcard);
                    console.log(`Created flashcard for question ${question.id}`);
                }
            });

            this.initialized = true;
            console.log('Question bank initialized successfully');
            console.log(`Loaded ${this.questions.size} questions across ${this.categories.size} categories`);
            
            return true;
        } catch (error) {
            console.error('Failed to initialize question bank:', error);
            throw new Error(`Question bank initialization failed: ${error.message}`);
        }
    }

    createQuestion(data: any): NCLEXQuestion {
        return {
            ...createBaseQuestion(data),
            validated: true
        };
    }

    getQuestionsByCategory(category: string, difficulty: string): NCLEXQuestion[] {
        return Array.from(this.questions.values())
            .filter(q => q.category === category && q.difficulty === difficulty);
    }

    getDueFlashcards(): any[] {
        const now = new Date();
        return Array.from(this.flashcards.values())
            .filter(card => card.nextReviewDate <= now)
            .sort((a, b) => a.nextReviewDate - b.nextReviewDate);
    }

    getFlashcards(): any[] {
        return Array.from(this.flashcards.values());
    }

    getStats() {
        return {
            totalQuestions: this.questions.size,
            totalFlashcards: this.flashcards.size,
            categoryCounts: Object.fromEntries(
                Array.from(this.categories.entries()).map(([category, data]) => [
                    category,
                    data.questionCount
                ])
            )
        };
    }
}

// React context for question bank
const QuestionBankContext = React.createContext<NCLEXQuestionBank | null>(null);

const QuestionBankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [questionBank, setQuestionBank] = useState<NCLEXQuestionBank | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeBank = async () => {
            try {
                const bank = new NCLEXQuestionBank();
                await bank.initialize();
                setQuestionBank(bank);
                setLoading(false);
            } catch (err) {
                console.error('Failed to initialize question bank:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        initializeBank();
    }, []);

    if (loading) {
        return <div className="text-center p-4">Initializing question bank...</div>;
    }

    if (error) {
        return <div className="text-red-500 p-4">Error: {error}</div>;
    }

    return (
        <QuestionBankContext.Provider value={questionBank}>
            {children}
        </QuestionBankContext.Provider>
    );
};

export {
    NCLEXQuestionBank,
    QuestionBankProvider,
    QuestionBankContext
};

// Define the base question structure
const initialQuestionBank = {
    questions: [
        createBaseQuestion({
            id: "SAFE_BEG_001",
            question: "Which of the following is the first step in implementing standard precautions?",
            options: [
                "Put on sterile gloves",
                "Perform hand hygiene",
                "Wear a mask",
                "Put on a gown"
            ],
            correctAnswer: 1,
            explanation: "Hand hygiene is always the first step in standard precautions as it is the most effective way to prevent the spread of infections.",
            category: "Safe and Effective Care Environment",
            subcategory: "Infection Control",
            difficulty: "BEGINNER",
            topic: "Standard Precautions"
        }),
        createBaseQuestion({
            id: "PHARM_INT_001",
            question: "A patient is prescribed furosemide (Lasix). Which assessment finding requires immediate notification of the healthcare provider?",
            options: [
                "Blood pressure 158/92",
                "Blood pressure 82/50",
                "Urine output 100ml/hr",
                "Respiratory rate 18/min"
            ],
            correctAnswer: 1,
            explanation: "Hypotension (BP 82/50) is a serious side effect of furosemide that requires immediate notification as it can indicate fluid volume depletion.",
            category: "Physiological Integrity",
            subcategory: "Pharmacological Therapies",
            difficulty: "INTERMEDIATE",
            topic: "Medication Administration"
        }),
        createBaseQuestion({
            id: "PSYCH_ADV_001",
            question: "A client with major depression is started on an SSRI. Which statement by the client indicates understanding of the medication therapy?",
            options: [
                "I should feel better within 24 hours",
                "I can stop the medication once I feel better",
                "It may take several weeks to notice improvement",
                "I should double the dose if symptoms worsen"
            ],
            correctAnswer: 2,
            explanation: "SSRIs typically take 4-6 weeks to reach full therapeutic effect. Understanding this timeframe is crucial for medication adherence.",
            category: "Psychosocial Integrity",
            subcategory: "Pharmacological Therapies",
            difficulty: "ADVANCED",
            topic: "Psychiatric Medications"
        })
    ],
    categories: {
        "Safe and Effective Care Environment": {
            subcategories: ["Infection Control", "Safety and Infection Control", "Management of Care"],
            questionCount: 0
        },
        "Health Promotion and Maintenance": {
            subcategories: ["Growth and Development", "Prevention and Early Detection of Disease"],
            questionCount: 0
        },
        "Psychosocial Integrity": {
            subcategories: ["Coping and Adaptation", "Psychosocial Adaptation"],
            questionCount: 0
        },
        "Physiological Integrity": {
            subcategories: ["Basic Care and Comfort", "Pharmacological Therapies", "Reduction of Risk Potential"],
            questionCount: 0
        }
    }
};