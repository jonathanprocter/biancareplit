import React, { useEffect, useState } from 'react';

const MorningGreeting = ({ userId }) => {
  const [greetingData, setGreetingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const response = await fetch(`/api/morning-greeting?user_id=${userId}`);
        const data = await response.json();
        if (data.success) {
          setGreetingData(data.data);
        }
      } catch (error) {
        console.error('Error fetching greeting:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGreeting();
  }, [userId]);

  if (loading) return <div>Loading your daily summary...</div>;
  if (!greetingData) return null;

  return (
    <div className="morning-greeting p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Good Morning!</h2>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Yesterday's Performance</h3>
        {greetingData.performance.topic_mastery?.map((topic) => (
          <div key={topic.topic} className="mb-2">
            <p className="font-medium">{topic.topic}</p>
            <p>Accuracy: {topic.score}%</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">AI Coach Interactions</h3>
        {greetingData.ai_coach_interactions?.map((interaction, index) => (
          <div key={index} className="mb-2">
            <p>{interaction.question}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">NCLEX Predictions</h3>
        {Object.entries(greetingData.nclex_predictions).map(([topic, prediction]) => (
          <div key={topic} className="mb-2">
            <p className="font-medium">{topic}</p>
            <p>Predicted Score: {prediction.predicted_score}%</p>
            <p>Confidence: {prediction.confidence_level}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MorningGreeting;
