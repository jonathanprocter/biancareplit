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

export function DifficultySelector({
  value,
  onValueChange,
  disabled = false,
}: DifficultySelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select difficulty" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="easy">Easy</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="hard">Hard</SelectItem>
      </SelectContent>
    </Select>
  );
}
