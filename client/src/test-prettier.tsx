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
  }, [title]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => (
          <div
            key={item.id}
            className="border rounded p-4 hover:shadow-lg transition-shadow"
            onClick={() => setSelectedId(item.id)}
          >
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
