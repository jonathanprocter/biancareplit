import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from './queryClient';

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  instructor: User;
  modules: Module[];
}

export interface Module {
  id: number;
  title: string;
  content: string;
  order: number;
  courseId: number;
}

export interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  enrolledAt: string;
  completed: boolean;
  points: number;
  correctAnswers: number;
  totalAttempts: number;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  requiredPoints: number;
  category: string;
  earnedAt?: string;
}

export interface UserProgress {
  totalPoints: number;
  accuracy: number;
  enrollments: (Enrollment & {
    course: Course;
  })[];
  badges: Badge[];
}

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store'
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Request failed: ${errorText}`);
      }

      const userData = await res.json();
      localStorage.setItem('userId', userData.id.toString());
      localStorage.setItem('username', userData.username);
      return userData;
    },
  });
};

export const useRegister = () => {
  return useMutation({
    mutationFn: async (userData: { username: string; password: string; email: string }) => {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Request failed: ${errorText}`);
      }

      return res.json();
    },
  });
};

// Course hooks
export const useCourses = () => {
  return useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });
};

export const useCourse = (id: number) => {
  return useQuery<Course>({
    queryKey: [`/api/courses/${id}`],
  });
};

export const useEnroll = () => {
  return useMutation({
    mutationFn: async (courseId: number) => {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Request failed: ${errorText}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
    },
  });
};

// Progress hooks
export const useUserProgress = (userId: number) => {
  return useQuery<UserProgress>({
    queryKey: [`/api/users/${userId}/progress`],
    staleTime: 30000, // Refresh every 30 seconds
  });
};

export const useUpdateProgress = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      enrollmentId,
      correct,
    }: {
      userId: number;
      enrollmentId: number;
      correct: boolean;
    }) => {
      const res = await fetch(`/api/users/${userId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId, correct }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Request failed: ${errorText}`);
      }

      return res.json();
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${userId}/progress`],
      });
    },
  });
};

// Learning path types
export interface LearningPath {
  id: number;
  userId: number;
  name: string;
  description: string;
  difficulty: string;
  estimatedCompletionTime: number;
  courses: {
    course: Course;
    order: number;
    isRequired: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  learningStyle: string;
  preferredStudyTime: number;
  preferredTopics: string[];
}

// Learning path hooks
export const useGenerateLearningPath = () => {
  return useMutation({
    mutationFn: async (userId: number) => {
      const res = await fetch(`/api/users/${userId}/learning-paths`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Request failed: ${errorText}`);
      }

      return res.json();
    },
  });
};

export const useLearningPaths = (userId: number) => {
  return useQuery<LearningPath[]>({
    queryKey: [`/api/users/${userId}/learning-paths`],
  });
};

export const useUpdatePreferences = () => {
  return useMutation({
    mutationFn: async ({
      userId,
      preferences,
    }: {
      userId: number;
      preferences: UserPreferences;
    }) => {
      const res = await fetch(`/api/users/${userId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Request failed: ${errorText}`);
      }

      return res.json();
    },
  });
};