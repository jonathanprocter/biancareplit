import { AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import React, { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useToast } from '@/hooks/use-toast';

interface UploadStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  result?: any;
  error?: string;
}

export const FileUploadWizard = () => {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newUploads = acceptedFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      for (const upload of newUploads) {
        try {
          setUploads((prev) =>
            prev.map((u) => (u.file === upload.file ? { ...u, status: 'uploading' } : u)),
          );

          const formData = new FormData();
          formData.append('file', upload.file);

          const response = await fetch('/api/content/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(await response.text());
          }

          const result = await response.json();

          setUploads((prev) =>
            prev.map((u) => (u.file === upload.file ? { ...u, status: 'complete', result } : u)),
          );

          toast({
            title: 'Upload Successful',
            description: `${upload.file.name} has been processed and integrated into the learning system.`,
          });
        } catch (error) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === upload.file ? { ...u, status: 'error', error: error.message } : u,
            ),
          );

          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: `Failed to process ${upload.file.name}. Please try again.`,
          });
        }
      }
    },
    [toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200 ease-in-out
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop your files here, or click to select files
          </p>
          <p className="text-xs text-gray-500">Supported formats: PDF, DOCX, TXT</p>
        </div>

        {uploads.length > 0 && (
          <div className="mt-6 space-y-4">
            {uploads.map((upload, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{upload.file.name}</span>
                  </div>
                  {upload.status === 'complete' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {upload.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                </div>

                {upload.status === 'uploading' && (
                  <Progress value={upload.progress} className="h-2" />
                )}

                {upload.status === 'error' && (
                  <p className="text-sm text-red-500 mt-1">{upload.error}</p>
                )}

                {upload.status === 'complete' && upload.result && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Extracted {upload.result.topics?.length || 0} topics</p>
                    <p>Generated {upload.result.flashcards?.length || 0} flashcards</p>
                    <p>Created {upload.result.quiz_questions?.length || 0} quiz questions</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileUploadWizard;
