import { useAuth } from "@/components/AuthProvider";

/** True when auth bootstrap finished and the user may call protected APIs. */
export function useAuthReady(): boolean {
  const { ready, authEnabled, user } = useAuth();
  return ready && (!authEnabled || user != null);
}
