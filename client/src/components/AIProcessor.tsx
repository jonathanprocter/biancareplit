import React, { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

import { useToast } from '@/hooks/use-toast';

import type { AIResponse } from '@/types/api';

interface ProcessingResult {
  content: string;
  metadata?: {
    confidence: number;
    source?: string;
  };
}

export const AIProcessor: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const { toast } = useToast();

  const handleProcess = useCallback(async () => {
    if (!input.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter some text to process.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AIResponse<ProcessingResult> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Processing failed');
      }

      setResult(data.data);
      toast({
        title: 'Processing Complete',
        description: 'AI has successfully processed your input.',
      });
    } catch (error) {
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [input, toast]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>AI Processor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Enter text to process..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[100px]"
          disabled={loading}
        />

        <Button onClick={handleProcess} disabled={loading || !input.trim()} className="w-full">
          {loading ? 'Processing...' : 'Process Input'}
        </Button>

        {result && (
          <div className="mt-4 p-4 border rounded-md">
            <h3 className="font-semibold mb-2">Result:</h3>
            <p className="whitespace-pre-wrap">{result.content}</p>
            {result.metadata && (
              <div className="mt-2 text-sm text-gray-500">
                <p>Confidence: {result.metadata.confidence}</p>
                {result.metadata.source && <p>Source: {result.metadata.source}</p>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIProcessor;
