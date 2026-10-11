/**
 * Minimal global toast bus. Components call `toast.error(...)` etc; the
 * <Toaster /> mounted in App.tsx renders whatever is emitted. Framework-light
 * on purpose: a module-level listener set avoids wrapping the whole tree in
 * a context provider.
 */

export type ToastTone = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  /** ms before auto-dismiss. 0 = sticky (still dismissible). */
  duration: number;
}

type Listener = (item: ToastItem) => void;

const listeners = new Set<Listener>();
let seq = 0;

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(tone: ToastTone, message: string, duration: number): void {
  seq += 1;
  const item: ToastItem = { id: seq, tone, message, duration };
  listeners.forEach((listener) => listener(item));
}

export const toast = {
  info: (message: string, duration = 4000) => emit("info", message, duration),
  success: (message: string, duration = 4000) =>
    emit("success", message, duration),
  error: (message: string, duration = 5000) => emit("error", message, duration),
};
