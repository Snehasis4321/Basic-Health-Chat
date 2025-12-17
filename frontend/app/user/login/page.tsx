'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserLoginForm from '@/components/auth/UserLoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function UserLoginPage() {
  const router = useRouter();
  const { loginUser, isAuthenticated, isUser } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && isUser) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isUser, router]);

  const handleSuccess = (token: string, user: { id: string; email: string }) => {
    loginUser(token, user);
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Login
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <UserLoginForm onSuccess={handleSuccess} />

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                href="/user/register"
                className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Register here
              </Link>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you a doctor?{' '}
              <Link
                href="/doctor/login"
                className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
              >
                Login as Doctor
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
