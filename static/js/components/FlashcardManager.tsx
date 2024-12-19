import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';

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
  questionBank: any;
  setQuestionBank: (bank: any) => void;
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

  useEffect(() => {
    const initializeFlashcardSystem = async () => {
      try {
        console.log('Initializing FlashcardManager...');
        
        // Import and initialize system integration first
        const systemModule = await import('../services/SystemIntegration');
        const systemIntegration = systemModule.default;
        
        if (!systemIntegration) {
          throw new Error('System integration module not found');
        }

        // Initialize the entire system
        console.log('Starting system initialization...');
        const initResult = await systemIntegration.initialize().catch(error => ({
          success: false,
          status: 'failed',
          error: error.message || 'Unknown error'
        }));
        
        if (!initResult || !initResult.success) {
          throw new Error(`System initialization failed: ${initResult?.error || 'Unknown error'}`);
        }

        // Get initialized flashcard system
        const { flashcardSystem } = systemIntegration;
        if (!flashcardSystem?.initialized) {
          throw new Error('Flashcard system not properly initialized');
        }

        // Set up question bank
        if (flashcardSystem.studyMaterialHandler) {
          console.log('Setting question bank...');
          setQuestionBank(flashcardSystem.studyMaterialHandler);
          console.log('Question bank set successfully');
        } else {
          throw new Error('Study material handler not available');
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Unknown initialization error';
        console.error('Failed to initialize flashcard system:', errorMessage);
        setError(`Failed to initialize question bank: ${errorMessage}`);
        setLoading(false);
      }
    };

    initializeFlashcardSystem();
  }, []);

  useEffect(() => {
    const initializeFlashcards = async () => {
      try {
        setLoading(true);
        console.log('Initializing flashcard system...');

        // First check if we can access the flashcard system
        const systemResponse = await fetch('/api/system/status');
        if (!systemResponse.ok) {
          const errorData = await systemResponse.json().catch(() => ({}));
          console.error('System status check failed:', errorData);
          throw new Error(errorData.message || 'Flashcard system is not available');
        }
        
        const systemData = await systemResponse.json();
        console.log('System status:', systemData);
        
        if (!systemData.initialized) {
          throw new Error('System not properly initialized');
        }

        // Then fetch flashcards with retry logic
        const fetchWithRetry = async (retries = 3) => {
          for (let i = 0; i < retries; i++) {
            try {
              const response = await fetch('/api/flashcards');
              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch flashcards: ${response.status}`);
              }
              return await response.json();
            } catch (error) {
              if (i === retries - 1) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
          }
        };

        const data = await fetchWithRetry();
        console.log('Fetched flashcards:', data);
        
        if (!Array.isArray(data)) {
          console.error('Invalid data structure received:', data);
          throw new Error('Invalid flashcard data received');
        }
        
        setFlashcards(data);
        setFlashcardCount(data.length);
        
        // Initialize question bank after flashcards are loaded
        try {
          const { default: flashcardSystem } = await import('../flashcard-system');
          console.log('Loaded flashcard system module:', flashcardSystem);
          
          if (flashcardSystem && typeof flashcardSystem.getMiddlewareSystem === 'function') {
            // Initialize middleware first
            await flashcardSystem.getMiddlewareSystem();
            setQuestionBank(flashcardSystem);
            console.log('Question bank initialized successfully');
          } else {
            throw new Error('Flashcard system module is missing required exports');
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error 
            ? err.message 
            : 'Failed to initialize question bank';
          console.error('Question bank initialization failed:', errorMessage);
          throw new Error(`Failed to initialize question bank: ${errorMessage}`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize flashcard system';
        console.error('Flashcard initialization error:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    initializeFlashcards();
  }, []);

  const getFilteredFlashcards = () => {
    return flashcards.filter(card => {
      const matchesSearch = searchTerm === '' || 
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.back.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDifficulty = filterDifficulty === 'all' || 
        card.difficulty === filterDifficulty;
      
      return matchesSearch && matchesDifficulty;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <p>{error}</p>
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
              <Badge variant="secondary">
                Total Cards: {flashcardCount}
              </Badge>
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
                    ? "No flashcards created yet. Start by adding your first flashcard!"
                    : "No flashcards match your current filters."}
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