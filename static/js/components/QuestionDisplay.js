import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Progress } from '@ui/progress';

export const QuestionDisplay = ({ question, onAnswer, showConfidence = true }) => {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confidence, setConfidence] = useState(3);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return;

    onAnswer({
      questionId: question.id,
      answer: selectedAnswer,
      confidence: confidence,
    });
    setShowExplanation(true);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <Badge variant={question.difficulty}>{question.difficulty}</Badge>
          <Badge>{question.category}</Badge>
        </div>
        <CardTitle className="mt-4">{question.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-2">
            {question.options.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswer === option ? 'secondary' : 'outline'}
                className="justify-start text-left"
                onClick={() => setSelectedAnswer(option)}
              >
                {option}
              </Button>
            ))}
          </div>

          {showConfidence && (
            <div className="mt-6">
              <label className="text-sm font-medium">Confidence Level: {confidence}</label>
              <Progress value={confidence * 20} className="mt-2" />
              <input
                type="range"
                min="1"
                max="5"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          )}

          <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer} className="w-full mt-4">
            Submit Answer
          </Button>

          {showExplanation && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Explanation</h3>
              <p className="whitespace-pre-line">{question.createDetailedAnswer()}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const FlashcardReview = ({ flashcard, onReview }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidence, setConfidence] = useState(3);

  const handleReview = () => {
    onReview({
      flashcardId: flashcard.id,
      confidence: confidence,
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <div className="min-h-[300px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <CardContent className="p-6">
          <div className="text-center">
            {!isFlipped ? (
              <div>
                <h3 className="text-xl font-semibold mb-4">Question</h3>
                <p>{flashcard.front}</p>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-semibold mb-4">Answer</h3>
                <p className="whitespace-pre-line">{flashcard.back}</p>
              </div>
            )}
          </div>
        </CardContent>
      </div>

      {isFlipped && (
        <CardContent className="border-t">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">How well did you know this?</label>
              <Progress value={confidence * 20} className="mt-2" />
              <input
                type="range"
                min="1"
                max="5"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <Button onClick={handleReview} className="w-full">
              Next Card
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
