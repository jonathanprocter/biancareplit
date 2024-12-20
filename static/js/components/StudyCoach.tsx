import React, { useState, useEffect } from 'react';
import { aiCoachService } from '../services/AICoachService';

interface NCLEXQuestion {
  stem: string;
  options: string[];
  correct_answer: number;
  rationale: string;
  client_needs: string;
  cognitive_level: string;
  integrated_processes: string[];
  keywords: string[];
}

interface Performance {
  weakestTopic: string;
  focusArea: string;
  metrics: {
    average_score: number;
    time_per_question: number;
    changed_answers_success: number;
  };
}

const StudyCoach: React.FC = () => {
  type MessageContent = string | NCLEXQuestion;
  interface ChatMessage {
    role: 'user' | 'assistant';
    content: MessageContent;
  }

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<NCLEXQuestion | null>(null);

  useEffect(() => {
    // Add initial greeting
    setMessages([
      {
        role: 'assistant',
        content:
          "Hello! I'm your AI study coach. How can I help you prepare for the NCLEX exam today? I can generate practice questions, provide study tips, or help you focus on specific nursing topics.",
      },
    ]);
  }, []);

  const fetchUserPerformance = async (): Promise<Performance> => {
    try {
      const response = await fetch('/api/nclex-coach/performance');
      return await response.json();
    } catch (error) {
      console.error('Error fetching user performance:', error);
      return {
        weakestTopic: 'pharmacology',
        focusArea: 'PHARMACOLOGICAL_THERAPIES',
        metrics: {
          average_score: 0.7,
          time_per_question: 90,
          changed_answers_success: 0.5,
        },
      };
    }
  };

  const generateNCLEXQuestion = async () => {
    setIsLoading(true);
    try {
      const performance = await fetchUserPerformance();
      const response = await fetch('/api/nclex-coach/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: performance.weakestTopic,
          client_needs: performance.focusArea,
          performance: performance.metrics,
        }),
      });

      const question = await response.json();
      setCurrentQuestion(question);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: question,
        },
      ]);
    } catch (error) {
      console.error('Error generating NCLEX question:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error generating the question. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    if (
      userMessage.toLowerCase().includes('question') ||
      userMessage.toLowerCase().includes('practice')
    ) {
      await generateNCLEXQuestion();
    } else {
      try {
        const response = await aiCoachService.getStudyTip(userMessage);
        setMessages((prev) => [...prev, { role: 'assistant', content: response.tip }]);
      } catch (error) {
        console.error('Error getting response:', error);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
          },
        ]);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="study-coach-container">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message ${msg.role}-message`}>
            <div className="message-content">
              {(() => {
                if (typeof msg.content === 'string') {
                  return <div className="text-content">{msg.content}</div>;
                }
                const question = msg.content as NCLEXQuestion;
                return (
                  <div className="question-content">
                    <p className="question-stem">{question.stem}</p>
                    <div className="options">
                      {question.options.map((option, idx) => (
                        <div key={idx} className="option">
                          {option}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <div className="typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>
      <div className="chat-input">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask a question..."
          rows={2}
        />
        <button onClick={handleSendMessage} disabled={isLoading} className="btn btn-primary">
          Send
        </button>
      </div>
    </div>
  );
};

export default StudyCoach;
