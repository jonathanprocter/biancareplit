import React, { ChangeEvent, FC } from 'react';

import { Input } from '@/components/ui/input';

interface FileUploadInputProps {
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export const FileUploadInput: FC<FileUploadInputProps> = ({ onFileChange, disabled = false }) => {
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.length ? event.target.files[0] : null;
    onFileChange(file);
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
};
