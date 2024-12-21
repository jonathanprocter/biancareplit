import { type FC, useEffect, useState } from 'react';

interface TestProps {
  title: string;
  items: Array<{
    id: number;
    name: string;
    description: string;
  }>;
}

// React component formatting test with more complex JSX
export const TestComponent: FC<TestProps> = ({ title, items }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedId !== null) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Selected item:', selectedId);
        console.log('Interaction time:', new Date().toISOString());
      }
    }
  }, [selectedId]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Component mounted with title:', title);
    }
    // Return cleanup function
    return () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Component unmounted');
      }
    };
  }, [title]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.id}
            className="rounded border p-4 transition-shadow hover:shadow-lg"
            onClick={() => setSelectedId(item.id)}
            tabIndex={0}
            aria-pressed={selectedId === item.id}
          >
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-600">{item.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
