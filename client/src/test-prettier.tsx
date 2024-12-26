import { type FC, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TestProps {
  title: string;
  items: Array<{
    id: number;
    name: string;
    description: string;
  }>;
}

export const TestComponent: FC<TestProps> = ({ title, items }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (selectedId !== null) {
      toast({
        title: 'Item Selected',
        description: `Selected item ID: ${selectedId}`,
        variant: 'info'
      });
    }
  }, [selectedId, toast]);

  useEffect(() => {
    toast({
      title: 'Component Mounted',
      description: `Mounted with title: ${title}`,
      variant: 'success'
    });

    return () => {
      toast({
        title: 'Component Unmounted',
        description: 'Cleanup complete',
        variant: 'info'
      });
    };
  }, [title, toast]);

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

export default TestComponent;