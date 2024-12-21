import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, FileText, BookOpen } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

export const InstructorDashboard: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState('general');
  const [topic, setTopic] = useState('');
  const [overview, setOverview] = useState('');
  const [timeframe, setTimeframe] = useState('daily');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysis, setAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/content/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      if (!data.success) {
        throw new Error(data.message || 'Content processing failed');
      }

      return data;
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      toast({
        title: "Upload Successful",
        description: "Content has been processed and analyzed",
      });
      setUploadProgress(100);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', contentType);
    formData.append('topic', topic);

    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 5, 90));
    }, 500);

    try {
      await uploadMutation.mutateAsync(formData);
    } finally {
      clearInterval(progressInterval);
    }
  };

  const renderAnalysis = () => {
    if (!analysis) return null;

    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Content Analysis</CardTitle>
          <CardDescription>
            AI-generated insights from the uploaded content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Learning Objectives */}
            <div>
              <h3 className="font-semibold mb-2">Learning Objectives</h3>
              <ul className="list-disc pl-6">
                {analysis.learning_objectives?.map((objective: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground">{objective}</li>
                ))}
              </ul>
            </div>

            {/* Key Concepts */}
            <div>
              <h3 className="font-semibold mb-2">Key Concepts</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {analysis.key_concepts?.map((concept: { term: string, definition: string }, index: number) => (
                  <Card key={index} className="p-4">
                    <h4 className="font-medium">{concept.term}</h4>
                    <p className="text-sm text-muted-foreground">{concept.definition}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Quiz Questions Preview */}
            <div>
              <h3 className="font-semibold mb-2">Generated Quiz Questions</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {analysis.quiz_questions?.length || 0} questions generated
              </p>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                View All Questions
              </Button>
            </div>

            {/* Additional Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Difficulty Level</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {analysis.difficulty_level}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Estimated Duration</h3>
                <p className="text-sm text-muted-foreground">
                  {analysis.estimated_duration_minutes} minutes
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleOverviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/instructor/course-overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overview, timeframe }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Error updating overview');
    }
    setLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Instructor Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload Study Material</CardTitle>
          <CardDescription>
            Upload educational content to generate AI-powered analysis and learning materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFileUpload} className="space-y-6">
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Content File</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer space-y-2 flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      {file ? (
                        <span className="text-primary font-medium">{file.name}</span>
                      ) : (
                        <>
                          <span className="font-semibold text-primary">Click to upload</span> or
                          drag and drop
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, DOCX, or TXT (max. 10MB)
                    </p>
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content Type</label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="general">General Content</option>
                    <option value="quiz">Generate Quiz</option>
                    <option value="flashcard">Generate Flashcards</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Topic</label>
                  <input
                    type="text"
                    placeholder="E.g., Anatomy, Chemistry, Mathematics"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <Button
              type="submit"
              disabled={!file || uploadMutation.isPending}
              className="w-full"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Upload and Analyze
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {renderAnalysis()}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Course Overview</h2>
        <form onSubmit={handleOverviewSubmit} className="space-y-4">
          <div>
            <textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Enter course overview..."
              className="border p-2 w-full h-32"
            />
          </div>
          <div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border p-2 w-full"
            >
              <option value="daily">Daily Overview</option>
              <option value="weekly">Weekly Overview</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            {loading ? 'Updating...' : 'Update Overview'}
          </button>
        </form>
      </div>

      {message && <div className="mt-4 p-4 bg-gray-100 rounded">{message}</div>}
    </div>
  );
};

export default InstructorDashboard;
