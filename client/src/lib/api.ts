import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
}

export const useRegister = () => {
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json() as Promise<User>;
    },
  });
};

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
}

export interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  enrolledAt: string;
  completed: boolean;
}

export const useLogin = () => {
  return useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json() as Promise<User>;
    },
  });
};

export const useCourses = () => {
  return useQuery<Course[]>({
    queryKey: ["/api/courses"],
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
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json() as Promise<Enrollment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    },
  });
};
export interface UserProgress {
  totalPoints: number;
  accuracy: number;
  enrollments: (Enrollment & {
    course: Course;
  })[];
  badges: Array<{
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    earnedAt: string;
  }>;
}

export const useUserProgress = (userId: number) => {
  return useQuery<UserProgress>({
    queryKey: [`/api/users/${userId}/progress`],
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, correct }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${userId}/progress`] });
    },
  });
};
