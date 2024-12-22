import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/performanceData');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: PerformanceData[] = await response.json();

        if (Array.isArray(data)) {
          setPerformanceData(data);
          calculatePredictiveIndex(data);

          const updatedCategories = updateCategoryDistribution(data);
          setCategoryData(updatedCategories);
        } else {
          throw new Error('Invalid data format received from API');
        }
      } catch (error) {
        console.error(
          'Error fetching analytics data:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        setError(error instanceof Error ? error.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const calculatePredictiveIndex = (data: PerformanceData[]) => {
    if (data.length === 0) return;

    // Calculate trend based on recent performance
    const recentScores = data.slice(-5);
    const averageScore =
      recentScores.reduce((acc, curr) => acc + curr.score, 0) / recentScores.length;
    const trend = recentScores[recentScores.length - 1].score - recentScores[0].score;

    // Predictive index formula: (average * 0.7) + (trend * 0.3)
    const index = averageScore * 0.7 + trend * 0.3;
    setPredictiveIndex(Math.round(index));
  };

  const updateCategoryDistribution = (data: PerformanceData[]): NCLEXCategory[] => {
    const updatedCategories = [...nclexCategories];

    data.forEach((performance) => {
      const categoryIndex = updatedCategories.findIndex((cat) =>
        cat.name.toLowerCase().includes(performance.category.toLowerCase()),
      );
      if (categoryIndex !== -1) {
        updatedCategories[categoryIndex] = {
          ...updatedCategories[categoryIndex],
          value: (updatedCategories[categoryIndex].value || 0) + performance.correctAnswers,
        };
      }
    });
    return updatedCategories;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-72">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-72">
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>NCLEX Performance Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Performance Trend Chart */}
          <div className="h-72">
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
          <div className="h-72">
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
