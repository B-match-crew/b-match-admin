import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

export function formatDate(date: string | Date): string {
  return format(new Date(date), "yyyy.MM.dd", { locale: ko });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "yyyy.MM.dd HH:mm", { locale: ko });
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ko });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm", { locale: ko });
}
