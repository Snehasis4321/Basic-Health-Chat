'use client';

import { useParams, useRouter } from 'next/navigation';
import ChatRoom from '@/components/chat/ChatRoom';

export default function PatientChatPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const handleLeave = () => {
    router.push('/');
  };

  return <ChatRoom roomId={roomId} role="patient" onLeave={handleLeave} />;
}
