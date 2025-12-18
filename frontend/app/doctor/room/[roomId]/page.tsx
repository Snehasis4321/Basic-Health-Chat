'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ChatRoom from '@/components/chat/ChatRoom';
import { useEffect } from 'react';

export default function DoctorChatPage() {
  const params = useParams();
  const router = useRouter();
  const { doctorToken, isDoctor, loading } = useAuth();
  const roomId = params.roomId as string;

  useEffect(() => {
    // Redirect to doctor login if not authenticated
    if (!loading && !isDoctor) {
      router.push('/doctor/login?redirect=/doctor/join-room');
    }
  }, [isDoctor, loading, router]);

  const handleLeave = () => {
    router.push('/doctor/join-room');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isDoctor) {
    return null;
  }

  return <ChatRoom roomId={roomId} role="doctor" token={doctorToken} onLeave={handleLeave} />;
}
