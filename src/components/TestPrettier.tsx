import React, { useCallback, useState } from 'react';

import Button from '@/components/ui/button';
import Card, { CardContent } from '@/components/ui/card';
import Input from '@/components/ui/input';

const TestPrettier: React.FC = () => {
  const [text, setText] = useState<string>('');

  const handleClick = useCallback(() => {
    console.log('clicked');
    setText('');
  }, []);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  }, []);

  return (
    <Card>
      <CardContent className="p-4">
        <Input value={text} onChange={handleChange} />
        <Button onClick={handleClick} className="mt-2">
          Clear
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestPrettier;
