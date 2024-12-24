import { AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import React, { useCallback, useEffect, useState } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useToast } from '@/hooks/use-toast';

interface UploadResult {
  topics?: string[];
  flashcards?: Array<{
    front: string;
    back: string;
  }>;
  quiz_questions?: Array<{
    question: string;
    options: string[];
    correct_answer: number;
  }>;
}

interface UploadStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  result?: UploadResult;
  error?: string;
}

export function FileUploadWizard() {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const { toast } = useToast();

  // Cleanup function for unmounting
  useEffect(() => {
    return () => {
      uploads.forEach((upload) => {
        if (upload.status === 'uploading') {
          toast({
            title: 'Upload Cancelled',
            description: `${upload.file.name} upload was cancelled due to navigation.`,
            variant: 'destructive',
          });
        }
      });
    };
  }, [uploads, toast]);

  const processFileUpload = useCallback(
    async (upload: UploadStatus) => {
      try {
        setUploads((prev) =>
          prev.map((u) =>
            u.file.name === upload.file.name ? { ...u, status: 'uploading', progress: 0 } : u,
          ),
        );

        const formData = new FormData();
        formData.append('file', upload.file);

        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded * 100) / event.total);
            setUploads((prev) =>
              prev.map((u) => (u.file.name === upload.file.name ? { ...u, progress } : u)),
            );
          }
        };

        const response = await fetch('/api/content/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();

        setUploads((prev) =>
          prev.map((u) =>
            u.file.name === upload.file.name ? { ...u, status: 'complete', result } : u,
          ),
        );

        toast({
          title: 'Upload Successful',
          description: `${upload.file.name} has been processed and integrated into the learning system.`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setUploads((prev) =>
          prev.map((u) =>
            u.file.name === upload.file.name ? { ...u, status: 'error', error: errorMessage } : u,
          ),
        );

        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: `Failed to process ${upload.file.name}: ${errorMessage}`,
        });
      }
    },
    [toast],
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Filter out files that are already being uploaded
      const newFiles = acceptedFiles.filter(
        (file) => !uploads.some((u) => u.file.name === file.name),
      );

      if (newFiles.length < acceptedFiles.length) {
        toast({
          title: 'Duplicate Files',
          description: 'Some files were skipped as they are already being uploaded.',
          variant: 'default',
        });
      }

      const newUploads = newFiles.map((file) => ({
        file,
        progress: 0,
        status: 'pending' as const,
      }));

      setUploads((prev) => [...prev, ...newUploads]);
      await Promise.all(newUploads.map(processFileUpload));
    },
    [processFileUpload, uploads, toast],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
    maxSize: 10485760, // 10MB
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
          <p className="text-xs text-gray-500">
            Supported formats: PDF, DOCX, DOC, TXT (Max size: 10MB)
          </p>
        </div>

        {uploads.length > 0 && (
          <div className="mt-6 space-y-4">
            {uploads.map((upload) => (
              <div
                key={`${upload.file.name}-${upload.file.size}`}
                className="border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{upload.file.name}</span>
                    <span className="text-sm text-gray-500">
                      ({Math.round(upload.file.size / 1024)} KB)
                    </span>
                  </div>
                  {upload.status === 'complete' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {upload.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                </div>

                {(upload.status === 'uploading' || upload.status === 'processing') && (
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
}

export default FileUploadWizard;
