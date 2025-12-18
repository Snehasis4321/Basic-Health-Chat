'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UserRegisterForm from '@/components/auth/UserRegisterForm';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export default function UserRegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isUser } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && isUser) {
      router.push('/patient/dashboard');
    }
  }, [isAuthenticated, isUser, router]);

  const handleSuccess = () => {
    setShowSuccess(true);
    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/user/login');
    }, 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Registration
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create your account
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          {showSuccess ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full dark:bg-green-900/20">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Registration Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <>
              <UserRegisterForm onSuccess={handleSuccess} />

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    href="/user/login"
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    Login here
                  </Link>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Are you a doctor?{' '}
                  <Link
                    href="/doctor/register"
                    className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
                  >
                    Register as Doctor
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
