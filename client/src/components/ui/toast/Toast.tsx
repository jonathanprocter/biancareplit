
import React from "react";
import { useToast } from "./use-toast";

export function Toast() {
  const { open, title, description, type, hide } = useToast();

  if (!open) return null;

  const bgColor = type === "success" ? "bg-green-500" : 
                 type === "error" ? "bg-red-500" : 
                 "bg-gray-800";

  React.useEffect(() => {
    const timer = setTimeout(hide, 5000);
    return () => clearTimeout(timer);
  }, [open, hide]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg text-white ${bgColor}`}>
      {title && <div className="font-semibold">{title}</div>}
      {description && <div className="text-sm">{description}</div>}
    </div>
  );
}
