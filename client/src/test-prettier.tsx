import { type FC, useState, useEffect } from 'react';

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
    console.log('Component mounted with title:', title);
    // Return cleanup function
    return () => {
      console.log('Component unmounted');
    };
  }, [title]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">{title}</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded border p-4 transition-shadow hover:shadow-lg"
            onClick={() => setSelectedId(item.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setSelectedId(item.id);
              }
            }}
          >
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
