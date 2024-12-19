import React, { useState, useEffect, createContext, useContext } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar } from 'lucide-react';

// Create contexts for flashcard system and question bank
export const FlashcardContext = createContext(null);
export const QuestionBankContext = createContext(null);

// Define SRS parameters for spaced repetition
const SRS_PARAMETERS = {
    BEGINNER: {
        baseInterval: 24,
        minInterval: 12,
        maxInterval: 60 * 24,
        easyBonus: 1.3,
        hardPenalty: 0.8,
        intervalModifier: 1.0
    },
    INTERMEDIATE: {
        baseInterval: 36,
        minInterval: 24,
        maxInterval: 90 * 24,
        easyBonus: 1.4,
        hardPenalty: 0.7,
        intervalModifier: 1.2
    },
    ADVANCED: {
        baseInterval: 48,
        minInterval: 36,
        maxInterval: 120 * 24,
        easyBonus: 1.5,
        hardPenalty: 0.6,
        intervalModifier: 1.4
    }
};

// FlashcardReview component for individual card review
const FlashcardReview = ({ flashcard, onReview }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [confidence, setConfidence] = useState(3);
    const [lastReviewResult, setLastReviewResult] = useState(null);
    const [studyStreak, setStudyStreak] = useState(0);
    const [showTooltip, setShowTooltip] = useState(false);

    const learningSteps = React.useMemo(() => {
        if (!flashcard?.back) return [];
        const backContent = flashcard.back.split('\n');
        return [
            { title: 'Answer', content: backContent[0] },
            { title: 'Explanation', content: backContent.slice(1, 3).join('\n') },
            { title: 'Key Points', content: backContent.slice(3).join('\n') }
        ];
    }, [flashcard]);

    if (!flashcard) {
        return (
            <Card className="w-full max-w-2xl mx-auto">
                <CardContent className="p-6 text-center">
                    <p>No flashcard available for review.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardContent className="p-6">
                <div className="mb-4">
                    <Progress value={(currentStep / learningSteps.length) * 100} />
                </div>

                <div 
                    className={`flashcard-content p-6 rounded-lg shadow-lg transition-all duration-500 
                            ${isFlipped ? 'bg-blue-50' : 'bg-white'}`}
                    onClick={() => setIsFlipped(!isFlipped)}
                >
                    {isFlipped ? (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">
                                {learningSteps[currentStep]?.title}
                            </h3>
                            <p className="text-gray-700 whitespace-pre-line">
                                {learningSteps[currentStep]?.content}
                            </p>
                            {currentStep < learningSteps.length - 1 && (
                                <Button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentStep(currentStep + 1);
                                    }}
                                >
                                    Next Step
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-xl font-bold mb-4">Question</h3>
                            <p>{flashcard.front}</p>
                        </div>
                    )}
                </div>

                <div className="mt-4">
                    <Button 
                        variant="outline"
                        onClick={() => setShowHints(!showHints)}
                        className="w-full"
                    >
                        {showHints ? 'Hide Hints' : 'Show Hints'}
                    </Button>
                    {showHints && flashcard.metadata?.relatedConcepts && (
                        <div className="mt-2 p-4 bg-gray-50 rounded">
                            <h4 className="font-semibold">Related Concepts:</h4>
                            <ul className="list-disc pl-4 mt-2">
                                {flashcard.metadata.relatedConcepts.map((concept, idx) => (
                                    <li key={idx}>{concept}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {isFlipped && currentStep === learningSteps.length - 1 && (
                    <div className="mt-6 space-y-4">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm">Confidence:</span>
                            <input 
                                type="range" 
                                min="1" 
                                max="5" 
                                value={confidence}
                                onChange={(e) => setConfidence(parseInt(e.target.value))}
                                className="w-full"
                            />
                            <span className="text-sm">{confidence}/5</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button 
                                onClick={() => onReview(flashcard.id, confidence, 1)}
                                variant="destructive"
                            >
                                Hard
                            </Button>
                            <Button 
                                onClick={() => onReview(flashcard.id, confidence, 3)}
                            >
                                Good
                            </Button>
                            <Button 
                                onClick={() => onReview(flashcard.id, confidence, 5)}
                                variant="outline"
                                className="bg-green-100 hover:bg-green-200"
                            >
                                Easy
                            </Button>
                        </div>
                    </div>
                )}

                {lastReviewResult && (
                    <div className={`mt-4 p-2 rounded-md text-center ${
                        lastReviewResult === 'correct' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                    }`}>
                        {lastReviewResult === 'correct' 
                            ? '✓ Correct! Keep up the good work!' 
                            : '× Not quite. Keep practicing!'}
                    </div>
                )}
                
                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            Next review: {new Date(flashcard.nextReviewDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                            <span className="mr-2">Study streak: {studyStreak}</span>
                            {studyStreak > 0 && <span className="text-yellow-500">🔥</span>}
                        </div>
                    </div>
                    
                    <div 
                        className="text-sm text-gray-500 cursor-help"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        Difficulty: {flashcard.metadata?.difficulty}
                        {showTooltip && (
                            <div className="absolute bg-white p-2 rounded-md shadow-lg border text-xs max-w-xs">
                                {flashcard.metadata?.difficulty === 'BEGINNER' && 'Foundational concepts and basic knowledge questions'}
                                {flashcard.metadata?.difficulty === 'INTERMEDIATE' && 'Application of knowledge and moderate complexity scenarios'}
                                {flashcard.metadata?.difficulty === 'ADVANCED' && 'Complex scenarios requiring deep understanding and critical thinking'}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Main FlashcardReviewSession component
const FlashcardReviewSession = ({ onBackToDashboard }) => {
    const questionBank = useContext(QuestionBankContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentCards, setCurrentCards] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sessionStats, setSessionStats] = useState({
        reviewed: 0,
        correct: 0,
        totalTime: 0,
        categoryProgress: {},
        studyStreak: 0,
        lastStudyDate: null
    });
    const [sessionStartTime, setSessionStartTime] = useState(Date.now());


    useEffect(() => {
        const initializeComponent = async () => {
            try {
                if (!questionBank) {
                    throw new Error("Question bank not initialized");
                }
                await loadDueCards();
                setLoading(false);
            } catch (err) {
                console.error("Failed to initialize FlashcardReviewSession:", err);
                setError(err.message);
                setLoading(false);
            }
        };
        
        initializeComponent();
    }, [questionBank]);

    const loadDueCards = async () => {
        try {
            // First try to fetch from API endpoint
            const response = await fetch('/api/flashcards/due');
            if (!response.ok) {
                throw new Error("Failed to fetch flashcards from API");
            }
            const dueCards = await response.json();
            console.log("Loaded flashcards:", dueCards); // Debug log

            // Filter cards if needed
            const filteredCards = selectedCategory === 'all' 
                ? dueCards 
                : dueCards.filter(card => card.metadata?.category === selectedCategory) || [];
            
            // Set cards in state
            setCurrentCards(filteredCards);
            
            // Update progress if cards were loaded
            if (filteredCards.length > 0) {
                const progress = (filteredCards.filter(card => card.reviewed).length / filteredCards.length) * 100;
                setProgress(progress);
            }
        } catch (error) {
            console.error("Error loading due cards:", error);
            setError("Failed to load flashcards");
            
            // Fallback to questionBank if available
            if (questionBank?.getDueFlashcards) {
                try {
                    const dueCards = await questionBank.getDueFlashcards();
                    const filteredCards = selectedCategory === 'all' 
                        ? dueCards 
                        : dueCards?.filter(card => card.metadata?.category === selectedCategory) || [];
                    setCurrentCards(filteredCards);
                } catch (fallbackError) {
                    console.error("Fallback also failed:", fallbackError);
                }
            }
        }
    };

    const handleReview = async (cardId, confidence, quality) => {
        try {
            const isCorrect = quality >= 3;
            setSessionStats(prev => ({
                ...prev,
                reviewed: prev.reviewed + 1,
                correct: prev.correct + (isCorrect ? 1 : 0),
                totalTime: Date.now() - sessionStartTime,
                studyStreak: isCorrect ? prev.studyStreak + 1 : 0,
                lastStudyDate: new Date()
            }));
            await loadDueCards();
        } catch (error) {
            console.error("Error handling review:", error);
            setError("Failed to update flashcard review");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen text-red-500">
                <p>{error}</p>
            </div>
        );
    }

    const categories = React.useMemo(() => {
      return questionBank ? Array.from(questionBank.categories.keys()) : [];
    }, [questionBank]);


    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <Button
                    onClick={onBackToDashboard}
                    className="flex items-center text-sm"
                >
                    ← Back to NCLEX Exam Preparation
                </Button>
            </div>

            {currentCards.length > 0 ? (
                <FlashcardReview 
                    flashcard={currentCards[0]}
                    onReview={handleReview}
                />
            ) : (
                <Card className="text-center py-8">
                    <CardContent>
                        <h3 className="text-xl font-semibold">All caught up!</h3>
                        <p className="text-gray-600">No more cards due for review.</p>
                        <Button 
                            onClick={onBackToDashboard}
                            className="mt-4"
                        >
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            )}

            <div className="mt-6">
                <Card>
                    <CardContent className="p-4">
                        <h3 className="font-semibold mb-3">Session Progress</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600">Cards Reviewed</p>
                                <p className="text-xl font-semibold">{sessionStats.reviewed}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Accuracy</p>
                                <p className="text-xl font-semibold">
                                    {sessionStats.reviewed > 0 
                                        ? `${Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}%`
                                        : '0%'}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600">Total Time</p>
                                <p className="text-xl font-semibold">
                                    {Math.floor((Date.now() - sessionStartTime) / 60000)}m
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FlashcardReviewSession;