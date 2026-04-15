import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  const d = (() => {
    if (date instanceof Date) return date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      // Treat YYYY-MM-DD as an all-day local date.
      return new Date(`${date}T00:00:00`);
    }
    return new Date(date);
  })();

  if (Number.isNaN(d.getTime())) return '';

  // Use numeric Mongolian format to avoid locale fallback to English.
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year} оны ${month}-р сарын ${day}`;
}

export function formatTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  // Force 24h HH:mm to avoid AM/PM in some environments.
  const pad2 = (value: number) => String(value).padStart(2, '0');
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0₮';
  }
  return price.toLocaleString('mn-MN') + '₮';
}

export function formatDateShort(date: Date | string): string {
  const d = new Date(date);
  const months = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function resolveEventImage(
  imageUrl: string | undefined,
  fallbackSeed: string,
  size: 'sm' | 'lg' = 'sm'
): string {
  const fallback = size === 'lg'
    ? `https://picsum.photos/seed/${fallbackSeed}/1200/800`
    : `https://picsum.photos/seed/${fallbackSeed}/800/600`;

  if (!imageUrl) return fallback;

  // Avoid Next image optimizer 400s when the file doesn't exist in /public.
  if (imageUrl.startsWith('/images/')) {
    return fallback;
  }

  // Keep full absolute URLs as-is.
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // Other relative paths are assumed to be frontend public assets.
  return imageUrl;
}
