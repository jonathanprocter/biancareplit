
import * as React from "react"
import { toast as sonnerToast } from "sonner"

export function useToast() {
  const toast = React.useCallback(
    ({ title, description, ...props }: { title?: string; description?: string; [key: string]: any }) => {
      return sonnerToast(description || title, {
        ...props,
        description: description ? title : undefined,
      })
    },
    []
  )

  return {
    toast,
    dismiss: sonnerToast.dismiss,
  }
}

export { sonnerToast as toast }
