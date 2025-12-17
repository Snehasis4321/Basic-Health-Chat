'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireUser?: boolean;
  requireDoctor?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requireUser = false,
  requireDoctor = false,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const { isUser, isDoctor, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check if user authentication is required
    if (requireUser && !isUser) {
      router.push(redirectTo);
      return;
    }

    // Check if doctor authentication is required
    if (requireDoctor && !isDoctor) {
      router.push(redirectTo);
      return;
    }

    // If either user or doctor auth is required (but not specific)
    if ((requireUser || requireDoctor) && !isUser && !isDoctor) {
      router.push(redirectTo);
      return;
    }
  }, [isUser, isDoctor, loading, requireUser, requireDoctor, redirectTo, router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if authentication check fails
  if (requireUser && !isUser) return null;
  if (requireDoctor && !isDoctor) return null;
  if ((requireUser || requireDoctor) && !isUser && !isDoctor) return null;

  return <>{children}</>;
}
