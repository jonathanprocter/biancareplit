import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { queryClient } from '@/lib/queryClient';

import { useToast } from '@/hooks/use-toast';

interface TestProps {
  title: string;
  items: Array<{ id: number; name: string }>;
}

export const TestPrettier = ({ title, items }: TestProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <Button onClick={() => setIsOpen(true)} variant="secondary">
          Open Dialog
        </Button>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Input value={item.name} readOnly />
              <Button
                onClick={() =>
                  toast({
                    title: 'Clicked',
                    description: `Clicked item ${item.id}`,
                  })
                }
                size="sm"
              >
                Click Me
              </Button>
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
};

export default TestPrettier;
