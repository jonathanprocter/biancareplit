
import { create } from "zustand";

type ToastState = {
  open: boolean;
  title?: string;
  description?: string;
  type?: "default" | "success" | "error";
  show: (params: { title?: string; description?: string; type?: "default" | "success" | "error" }) => void;
  hide: () => void;
};

export const useToast = create<ToastState>((set) => ({
  open: false,
  title: undefined,
  description: undefined,
  type: "default",
  show: ({ title, description, type = "default" }) =>
    set({ open: true, title, description, type }),
  hide: () => set({ open: false }),
}));
