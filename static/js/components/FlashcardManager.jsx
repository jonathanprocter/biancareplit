import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Brain, Clock, TrendingUp, Target, BookOpen, 
  Calendar, Activity, AlertCircle, Search 
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  ScatterChart, Scatter, ZAxis 
} from 'recharts';
import { ForceGraph2D } from 'react-force-graph';

const FlashcardManager = () => {
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch flashcards from the server
  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/flashcards');
        if (!response.ok) {
          throw new Error('Failed to fetch flashcards');
        }
        const data = await response.json();
        setFlashcards(data);
        setFlashcardCount(data.length);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching flashcards:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlashcards();
  }, []);

  // Filter and search functionality
  const getFilteredFlashcards = () => {
    return flashcards.filter(card => {
      const matchesSearch = searchTerm === '' || 
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.back.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDifficulty = filterDifficulty === 'all' || 
        card.difficulty === filterDifficulty;
      
      const matchesTopic = filterTopic === 'all' || 
        card.keywords.includes(filterTopic);
      
      return matchesSearch && matchesDifficulty && matchesTopic;
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
        <AlertCircle className="mr-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
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
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>
              ))}
            </div>

            {getFilteredFlashcards().length === 0 && (
              <div className="flex items-center justify-center p-8 text-gray-500">
                <AlertCircle className="mr-2" />
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
  );
};

export default FlashcardManager;