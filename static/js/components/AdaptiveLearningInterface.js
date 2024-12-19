import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, BookOpen, Target, Clock, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const AdaptiveLearningInterface = () => {
    const [currentContent, setCurrentContent] = useState(null);
    const [learningPatterns, setLearningPatterns] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        // Fetch initial learning patterns and performance data
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const [patternsResponse, performanceResponse] = await Promise.all([
                fetch('/api/learning-patterns'),
                fetch('/api/performance-data')
            ]);

            const patterns = await patternsResponse.json();
            const performance = await performanceResponse.json();

            setLearningPatterns(patterns);
            setPerformanceData(performance);

            // Generate initial content based on patterns
            await generateAdaptiveContent(patterns, performance);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const generateAdaptiveContent = async (patterns, performance) => {
        setLoading(true);
        try {
            const response = await fetch('/api/adaptive-content/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learningPatterns: patterns,
                    performanceData: performance
                })
            });

            const content = await response.json();
            setCurrentContent(content);
        } catch (error) {
            console.error('Error generating content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSubmission = async (answer) => {
        setSelectedAnswer(answer);
        
        try {
            const response = await fetch('/api/adaptive-content/submit-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contentId: currentContent.id,
                    answer: answer,
                    timeSpent: calculateTimeSpent(),
                    confidenceLevel: calculateConfidence()
                })
            });

            const result = await response.json();
            setFeedback(result.feedback);

            // Update patterns and generate new content
            await updateLearningPatterns(result.patterns);
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    };

    const updateLearningPatterns = async (newPatterns) => {
        setLearningPatterns(newPatterns);
        await generateAdaptiveContent(newPatterns, performanceData);
    };

    return (
        <div className="space-y-6 p-6">
            {/* Progress Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Learning Progress
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span>Overall Progress</span>
                            <span>{performanceData?.overallProgress || 0}%</span>
                        </div>
                        <Progress value={performanceData?.overallProgress || 0} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="font-semibold">Current Level</div>
                                <div className="mt-2 text-2xl">
                                    {learningPatterns?.currentLevel || 'Beginner'}
                                </div>
                            </div>
                            
                            <div className="p-4 bg-green-50 rounded-lg">
                                <div className="font-semibold">Topics Mastered</div>
                                <div className="mt-2 text-2xl">
                                    {performanceData?.masteredTopics || 0}
                                </div>
                            </div>
                            
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <div className="font-semibold">Study Streak</div>
                                <div className="mt-2 text-2xl">
                                    {performanceData?.studyStreak || 0} days
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Content */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Adaptive Content
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                        </div>
                    ) : currentContent ? (
                        <div className="space-y-6">
                            {/* Question or Content Display */}
                            <div className="p-4 border rounded-lg">
                                <div className="font-medium mb-4">{currentContent.question}</div>
                                
                                <div className="space-y-2">
                                    {currentContent.options?.map((option, index) => (
                                        <Button
                                            key={index}
                                            variant={selectedAnswer === index ? "secondary" : "outline"}
                                            className="w-full justify-start text-left"
                                            onClick={() => handleAnswerSubmission(index)}
                                        >
                                            {option}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Feedback Display */}
                            {feedback && (
                                <div className={`p-4 rounded-lg ${
                                    feedback.correct ? 'bg-green-50' : 'bg-red-50'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className={
                                            feedback.correct ? 'text-green-500' : 'text-red-500'
                                        } />
                                        <span className="font-medium">
                                            {feedback.message}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        {feedback.explanation}
                                    </div>
                                </div>
                            )}

                            {/* Content Metadata */}
                            <div className="flex flex-wrap gap-2">
                                <Badge>
                                    {currentContent.difficulty} Difficulty
                                </Badge>
                                <Badge variant="outline">
                                    {currentContent.topic}
                                </Badge>
                                {currentContent.tags?.map(tag => (
                                    <Badge key={tag} variant="secondary">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-500">
                            No content available. Start by generating new content.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Learning Insights */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Learning Insights
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {learningPatterns?.insights?.map((insight, index) => (
                            <div key={index} className="flex items-start gap-3">
                                <div className="p-2 rounded-full bg-blue-50">
                                    <Brain className="h-4 w-4 text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-medium">{insight.title}</div>
                                    <div className="text-sm text-gray-600">
                                        {insight.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdaptiveLearningInterface;

    setupNavigationControls(container) {
        const controls = document.createElement('div');
        controls.className = 'navigation-controls';
        
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next Question';
        nextButton.onclick = () => this.fetchNextContent();
        
        controls.appendChild(nextButton);
        container.appendChild(controls);
    }

    updatePatternDisplay() {
        const patternSection = document.getElementById('learning-patterns');
        if (!patternSection || !this.learningPatterns) return;
        
        patternSection.innerHTML = `
            <h3>Your Learning Profile</h3>
            <p>Current Level: ${this.learningPatterns.currentLevel}</p>
            <p>Preferred Style: ${this.learningPatterns.preferredStyle}</p>
            <div class="insights">
                ${this.learningPatterns.insights.map(insight => `
                    <div class="insight-card">
                        <h4>${insight.title}</h4>
                        <p>${insight.description}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    displayContent() {
        const contentSection = document.getElementById('adaptive-content');
        if (!contentSection || !this.currentContent) return;
        
        contentSection.innerHTML = `
            <div class="question-card">
                <h3>${this.currentContent.question}</h3>
                <div class="options">
                    ${this.currentContent.options.map(option => `
                        <button onclick="handleAnswer('${option}')">${option}</button>
                    `).join('')}
                </div>
                <p class="difficulty">Difficulty: ${this.currentContent.difficulty}</p>
                <p class="topic">Topic: ${this.currentContent.topic}</p>
            </div>
        `;
    }

    async handleAnswer(answer) {
        if (!this.currentContent) return;
        
        try {
            const response = await fetch('/api/adaptive-content/submit-answer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contentId: this.currentContent.id,
                    answer: answer,
                    timeSpent: this.calculateTimeSpent()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            this.showFeedback(result.feedback);
            
            // Update learning patterns after answer
            await this.fetchLearningPatterns();
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    }

    calculateTimeSpent() {
        // Implementation for calculating time spent on question
        return 0; // Placeholder
    }

    showFeedback(feedback) {
        const contentSection = document.getElementById('adaptive-content');
        if (!contentSection) return;
        
        const feedbackElement = document.createElement('div');
        feedbackElement.className = `feedback ${feedback.correct ? 'correct' : 'incorrect'}`;
        feedbackElement.innerHTML = `
            <h4>${feedback.message}</h4>
            <p>${feedback.explanation}</p>
        `;
        
        contentSection.appendChild(feedbackElement);
    }
}
