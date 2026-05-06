import { useAppUpdateNotifier } from "@/hooks/useAppUpdateNotifier";

/** Mount-only component that polls for new deployments and toasts the user. */
export function AppUpdateNotifier() {
  useAppUpdateNotifier();
  return null;
}
