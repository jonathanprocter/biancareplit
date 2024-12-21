import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { useCourse, useEnroll } from '@/lib/api';

import { useToast } from '@/hooks/use-toast';

interface Module {
  id: number;
  order: number;
  title: string;
  content: string;
}

interface CourseData {
  title: string;
  description: string;
  modules: Module[];
}

export function Course({ params }: { params: { id: string } }) {
  const courseId = parseInt(params.id, 10);
  const { data: course, isLoading } = useCourse<CourseData>(courseId);
  const enroll = useEnroll();
  const { toast } = useToast();

  const handleEnroll = React.useCallback(async () => {
    try {
      await enroll.mutateAsync(courseId);
      toast({
        title: 'Success',
        description: 'You have been enrolled in the course',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to enroll',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    }
  }, [enroll, courseId, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold text-red-600">Course not found</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <Button onClick={handleEnroll} disabled={enroll.isPending}>
          {enroll.isPending ? 'Enrolling...' : 'Enroll Now'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{course.description}</p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Course Modules</h2>
        {course.modules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <CardTitle className="text-xl">
                {module.order}. {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{module.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
