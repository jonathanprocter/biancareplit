
import React, { useState } from 'react';

export const InstructorDashboard: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState('general');
  const [topic, setTopic] = useState('');
  const [overview, setOverview] = useState('');
  const [timeframe, setTimeframe] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', contentType);
    formData.append('topic', topic);

    try {
      const response = await fetch('/api/instructor/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Error uploading file');
    }
    setLoading(false);
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
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Upload Study Material</h2>
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="border p-2 w-full"
            />
          </div>
          <div>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="border p-2 w-full"
            >
              <option value="general">General Content</option>
              <option value="quiz">Generate Quiz</option>
              <option value="flashcard">Generate Flashcards</option>
            </select>
          </div>
          <div>
            <input
              type="text"
              placeholder="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="border p-2 w-full"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>

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

      {message && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          {message}
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;
