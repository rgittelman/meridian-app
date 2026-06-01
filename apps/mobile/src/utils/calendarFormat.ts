import type { MeridianCalendarEvent } from '@/types/calendar';

export function formatEventDateRange(event: MeridianCalendarEvent): string {
  const start = event.startTime;
  const end = event.endTime;

  if (event.allDay) {
    const sameDay =
      start.toDateString() === end.toDateString();
    if (sameDay) {
      return start.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
    }
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  }

  const date = start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const endTime = end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} · ${startTime} – ${endTime}`;
}

export function categoryDisplayLabel(
  category: MeridianCalendarEvent['inferredCategory'],
): string | null {
  if (!category) return null;
  const labels: Record<string, string> = {
    family: 'Family',
    work: 'Work',
    health: 'Health',
    household: 'Home',
    personal: 'Personal',
    financial: 'Financial',
  };
  return labels[category] ?? category;
}
