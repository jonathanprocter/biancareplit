import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { systemIntegration } from '../SystemIntegration';

const StudyCoachInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeCoach = async () => {
      try {
        await systemIntegration.studyCoach?.initialize();
      } catch (error) {
        console.error('Failed to initialize study coach:', error);
      }
    };

    initializeCoach();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: inputValue }]);

    try {
      const response = await systemIntegration.studyCoach?.askQuestion(
        inputValue.trim()
      );
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        { role: 'error', content: 'Failed to get response. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
      setInputValue('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Study Coach</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex-1 overflow-y-auto max-h-96 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-100 ml-auto'
                    : message.role === 'error'
                    ? 'bg-red-100'
                    : 'bg-gray-100'
                }`}
              >
                <p className="text-sm">{message.content}</p>
              </div>
            ))}
          </div>

          <div className="flex space-x-2">
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask your study coach..."
              className="flex-1 p-2 border rounded-lg"
              onKeyPress={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading}
              className="whitespace-nowrap"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudyCoachInterface;
