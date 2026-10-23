export const SIGN_OUT = new Date('2026-10-29T11:00:00+01:00').getTime();
export function remainingTime(now = Date.now()) {
  const total = Math.max(0, Math.floor((SIGN_OUT - now) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor(total % 86400 / 3600), minutes: Math.floor(total % 3600 / 60), seconds: total % 60, complete: now >= SIGN_OUT };
}
export function safeRead(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function safeSave(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
export function saveBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); }
export function calendarFile() { return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Invincibles 26//Class Sign-Out//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:invincibles26-signout@aee-ui', 'DTSTAMP:20261022T000000Z', 'DTSTART:20261029T100000Z', 'SUMMARY:The Invincibles 26 — Sign-out', 'DESCRIPTION:Scheduled end of TAE 521. Agricultural and Environmental Engineering\\, University of Ibadan.', 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n'); }
