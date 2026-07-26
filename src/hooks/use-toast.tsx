import * as React from 'react'

type ToastVariant = 'default' | 'destructive' | 'success'

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastInput = Omit<ToastItem, 'id'>

const listeners = new Set<(toasts: ToastItem[]) => void>()
let toasts: ToastItem[] = []

function emit() {
  listeners.forEach((listener) => listener(toasts))
}

export function toast(input: ToastInput) {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, ...input }]
  emit()
  setTimeout(() => dismissToast(id), 4000)
  return id
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function useToast() {
  const [state, setState] = React.useState<ToastItem[]>(toasts)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return { toasts: state, toast, dismiss: dismissToast }
}
