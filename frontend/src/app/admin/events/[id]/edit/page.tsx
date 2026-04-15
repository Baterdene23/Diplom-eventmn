'use client';

import { useParams } from 'next/navigation';
import EventForm from '@/components/admin/EventForm';

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id as string;

  return <EventForm eventId={eventId} />;
}
