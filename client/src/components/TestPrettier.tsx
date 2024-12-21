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
      <Button onClick={() => setIsOpen(true)} variant="secondary">
        Open Dialog
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="bg-background p-6 rounded-lg shadow-lg space-y-4">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="flex items-center gap-2">
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TestPrettier;
