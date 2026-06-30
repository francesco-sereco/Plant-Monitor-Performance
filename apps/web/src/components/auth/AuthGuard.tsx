"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { LoadingState } from "@/components/ui";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authEnabled, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!ready || !authEnabled || isPublic) return;
    if (!user) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [ready, authEnabled, user, isPublic, pathname, router]);

  if (!ready) {
    return <LoadingState fullScreen />;
  }

  if (authEnabled && !user && !isPublic) {
    return <LoadingState fullScreen />;
  }

  return <>{children}</>;
}
