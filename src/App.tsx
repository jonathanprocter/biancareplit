
import React from 'react';
import { Layout } from './components/Layout';
import { ContentFlashcardIntegration } from './components/ContentFlashcardIntegration';

export default function App() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-4">
        <ContentFlashcardIntegration />
      </div>
    </Layout>
  );
}
