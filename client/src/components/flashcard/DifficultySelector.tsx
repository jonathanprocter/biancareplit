import React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Difficulty } from './types';

interface DifficultySelectorProps {
  value: Difficulty;
  onValueChange: (value: Difficulty) => void;
  disabled?: boolean;
}

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  return (
    <Select value={value} onChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-180px">
        <SelectValue>{value || 'Select difficulty'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="easy">Easy</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="hard">Hard</SelectItem>
      </SelectContent>
    </Select>
  );
};
