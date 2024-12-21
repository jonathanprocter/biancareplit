import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PerformanceData {
  category: string;
  score: number;
  timestamp: string;
  totalQuestions: number;
  correctAnswers: number;
}

interface NCLEXCategory {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const nclexCategories: NCLEXCategory[] = [
  { name: 'Safe and Effective Care Environment', value: 0, color: COLORS[0] },
  { name: 'Health Promotion and Maintenance', value: 0, color: COLORS[1] },
  { name: 'Psychosocial Integrity', value: 0, color: COLORS[2] },
  { name: 'Physiological Integrity', value: 0, color: COLORS[3] },
  { name: 'Management of Care', value: 0, color: COLORS[4] },
];

export function AnalyticsVisualizer() {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [categoryData, setCategoryData] = useState<NCLEXCategory[]>(nclexCategories);
  const [predictiveIndex, setPredictiveIndex] = useState<number>(0);

  useEffect(() => {
    // Fetch performance data
    const fetchData = async () => {
      try {
        // Use mock data for initial implementation
        const mockData = [
          { category: 'Safe Care', score: 85, timestamp: '2024-01-01', totalQuestions: 20, correctAnswers: 17 },
          { category: 'Health Promotion', score: 78, timestamp: '2024-01-02', totalQuestions: 15, correctAnswers: 12 },
          { category: 'Psychosocial', score: 92, timestamp: '2024-01-03', totalQuestions: 25, correctAnswers: 23 },
        ];
        
        setPerformanceData(mockData);
        calculatePredictiveIndex(mockData);
        
        // Initialize category distribution with mock data
        const updatedCategories = nclexCategories.map((category, index) => ({
          ...category,
          value: Math.floor(Math.random() * 40) + 60 // Random scores between 60-100
        }));
        setCategoryData(updatedCategories);
        
      } catch (error) {
        console.error('Error setting up analytics data:', error);
      }
    };

    fetchData();
  }, []);

  const calculatePredictiveIndex = (data: PerformanceData[]) => {
    if (data.length === 0) return;

    // Calculate trend based on recent performance
    const recentScores = data.slice(-5);
    const averageScore = recentScores.reduce((acc, curr) => acc + curr.score, 0) / recentScores.length;
    const trend = recentScores[recentScores.length - 1].score - recentScores[0].score;
    
    // Predictive index formula: (average * 0.7) + (trend * 0.3)
    const index = (averageScore * 0.7) + (trend * 0.3);
    setPredictiveIndex(Math.round(index));
  };

  const updateCategoryDistribution = (data: PerformanceData[]) => {
    // Update category distribution based on performance data
    const updatedCategories = [...nclexCategories];
    // Calculate values based on performance data
    setCategoryData(updatedCategories);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>NCLEX Performance Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Performance Trend Chart */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* NCLEX Category Distribution */}
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Predictive Index */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Predictive Success Index</h3>
            <div className="text-3xl font-bold">{predictiveIndex}%</div>
            <p className="text-sm mt-2">
              Based on your current performance trajectory and learning patterns
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
