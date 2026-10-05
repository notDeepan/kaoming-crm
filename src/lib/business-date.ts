import { formatInTimeZone } from 'date-fns-tz';

export function taipeiDate(now = new Date()) {
  return formatInTimeZone(now, 'Asia/Taipei', 'yyyy-MM-dd');
}
