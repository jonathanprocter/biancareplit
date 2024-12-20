import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import type { SystemIntegration } from '../types/js/SystemIntegration';
import type { StudyMaterialHandler } from '../types/js/study-material-handler';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Search } from 'lucide-react';

// Add debug logging utility
const debug = (message: string, ...args: any[]) => {
  console.log(`[FlashcardManager] ${message}`, ...args);
};

interface Flashcard {
  id: number;
  front: string;
  back: string;
  difficulty: string;
  keywords: string[];
  createdAt: string;
  lastReviewed: string | null;
  reviewCount: number;
  easiness: number;
  interval: number;
  nextReview: string | null;
}

// Create contexts with proper types
interface FlashcardContextType {
  flashcards: Flashcard[];
  setFlashcards: (cards: Flashcard[]) => void;
}

interface QuestionBankContextType {
  questionBank: {
    initialized: boolean;
    getMiddlewareSystem: () => Promise<void>;
    studyMaterialHandler?: {
      getQuestions: () => Promise<Array<any>>;
      updateQuestion: (id: number, data: any) => Promise<void>;
    };
  } | null;
  setQuestionBank: (bank: QuestionBankContextType['questionBank']) => void;
}

const FlashcardContext = React.createContext<FlashcardContextType | null>(null);
const QuestionBankContext = React.createContext<QuestionBankContextType | null>(null);

const FlashcardManager: React.FC = () => {
  // State with proper type definitions
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questionBank, setQuestionBank] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        debug('Starting initialization...');

        // Check system status
        debug('Checking system status...');
        const statusResponse = await fetch('/api/system/status');
        if (!statusResponse.ok) {
          throw new Error(`System status check failed: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        debug('System status:', statusData);

        if (!statusData.initialized) {
          throw new Error('System is not initialized');
        }

        // Load and initialize system integration
        debug('Loading SystemIntegration module...');
        const SystemIntegrationModule = await import('../services/SystemIntegration').catch(
          (err) => {
            debug('Failed to import SystemIntegration:', err);
            throw new Error('Failed to load system integration module');
          },
        );

        const systemIntegration = new SystemIntegrationModule.default();
        debug('SystemIntegration instantiated');

        const initResult = await systemIntegration.initialize();
        debug('System initialization result:', initResult);

        if (!initResult?.success) {
          throw new Error(`System initialization failed: ${initResult?.error || 'unknown error'}`);
        }

        // Initialize flashcard system
        const { flashcardSystem } = systemIntegration;
        if (!flashcardSystem?.initialized) {
          throw new Error('Flashcard system not initialized');
        }

        if (!flashcardSystem.studyMaterialHandler) {
          throw new Error('Study material handler not available');
        }

        debug('Loading flashcards...');
        const flashcardsResponse = await fetch('/api/flashcards');
        if (!flashcardsResponse.ok) {
          throw new Error(`Failed to fetch flashcards: ${flashcardsResponse.status}`);
        }

        const flashcardsData = await flashcardsResponse.json();
        debug('Received flashcards:', flashcardsData);

        if (!Array.isArray(flashcardsData)) {
          throw new Error('Invalid flashcard data received');
        }

        setFlashcards(flashcardsData);
        setFlashcardCount(flashcardsData.length);

        // Set up question bank
        setQuestionBank({
          initialized: true,
          getMiddlewareSystem: flashcardSystem.getMiddlewareSystem,
          studyMaterialHandler: flashcardSystem.studyMaterialHandler,
        });

        debug('Initialization completed successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
        debug('Initialization failed:', errorMessage);
        setError(errorMessage);
        // Notify user of the error
        toast({
          variant: 'destructive',
          title: 'Initialization Error',
          description: errorMessage,
        });
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [toast]); // Add toast to dependencies

  const getFilteredFlashcards = () => {
    return flashcards.filter((card) => {
      const matchesSearch =
        searchTerm === '' ||
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.back.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDifficulty = filterDifficulty === 'all' || card.difficulty === filterDifficulty;

      return matchesSearch && matchesDifficulty;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading flashcards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-8 gap-4">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading flashcards</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <FlashcardContext.Provider value={{ flashcards, setFlashcards }}>
      <QuestionBankContext.Provider value={questionBank}>
        <div className="space-y-6 p-4">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="knowledge-map">Knowledge Map</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Flashcards Dashboard</h2>
                  <Badge variant="secondary">Total Cards: {flashcardCount}</Badge>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Search flashcards..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFilteredFlashcards().map((card) => (
                    <Card key={card.id} className="hover:shadow-lg transition-shadow">
                      <div className="p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="secondary" className="capitalize">
                            {card.difficulty}
                          </Badge>
                          {card.keywords.map((keyword) => (
                            <Badge key={keyword} variant="outline" className="capitalize">
                              {keyword.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                        <p className="font-medium mb-2">{card.front}</p>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(card.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {getFilteredFlashcards().length === 0 && (
                  <div className="flex items-center justify-center p-8 text-gray-500">
                    <p>
                      {flashcards.length === 0
                        ? 'No flashcards created yet. Start by adding your first flashcard!'
                        : 'No flashcards match your current filters.'}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="p-4">Analytics content coming soon...</div>
            </TabsContent>

            <TabsContent value="knowledge-map">
              <div className="p-4">Knowledge map visualization coming soon...</div>
            </TabsContent>
          </Tabs>
        </div>
      </QuestionBankContext.Provider>
    </FlashcardContext.Provider>
  );
};

export default FlashcardManager;
