import { type ChangeEvent } from 'react';

import { Input } from '@/components/ui/input';

interface FileUploadInputProps {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export function FileUploadInput({ onFileChange, disabled = false }: FileUploadInputProps) {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    onFileChange(file || null);
  };

  return (
    <Input
      type="file"
      onChange={handleFileChange}
      accept=".pdf,.doc,.docx,.txt"
      className="flex-1"
      disabled={disabled}
    />
  );
}
