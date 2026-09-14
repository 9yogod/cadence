/* Spaced repetition for the expression deck.

   Before this, the warm-up phase just showed whichever saved expressions had gone
   longest without being displayed (`seen`). That is a display order, not a schedule:
   an expression you got wrong today was as likely to reappear in three weeks as
   tomorrow, so the history the app collected never actually drove the practice.

   This is SM-2, trimmed to what a phone screen can ask for. Three grades instead of
   six — 다시 / 애매 / 알아요 — because a fourth button buys little once `알아요`
   compounds by `ease` (1 → 3 → 7 → 18 → 45 days …), and every extra choice on a
   33-minute routine is friction.

   Cards are the note objects themselves, so scheduling rides along in
   notes:expressions and needs no separate store. Legacy notes have no scheduling
   fields; initCard backfills them as new-and-due rather than pretending they were
   ever reviewed. */

export const DAY = 86400000;
const MIN_EASE = 1.3;
const MAX_IVL = 365;      // past a year the interval stops meaning anything useful
const AGAIN_DELAY = 10 * 60 * 1000;  // a lapse comes back inside the same session

export function initCard(n, now) {
  now = now || Date.now();
  if (n.due == null) { n.due = now; n.ivl = 0; n.reps = 0; n.lapses = 0; }
  if (n.ease == null) n.ease = 2.5;
  if (n.ivl == null) n.ivl = 0;
  if (n.reps == null) n.reps = 0;
  if (n.lapses == null) n.lapses = 0;
  return n;
}

export function ensureAll(notes, now) {
  now = now || Date.now();
  (notes || []).forEach(n => initCard(n, now));
  return notes;
}

export function isDue(n, now) { return (n.due || 0) <= (now || Date.now()); }

export function dueCount(notes, now) {
  now = now || Date.now();
  return (notes || []).filter(n => isDue(n, now)).length;
}

/* 'again' | 'hard' | 'good' — mutates the card and returns it. */
export function grade(n, q, now) {
  now = now || Date.now();
  initCard(n, now);

  if (q === 'again') {
    n.lapses += 1;
    n.reps = 0;
    n.ease = Math.max(MIN_EASE, n.ease - 0.2);
    n.ivl = 0;
    n.due = now + AGAIN_DELAY;
  } else if (q === 'hard') {
    n.ease = Math.max(MIN_EASE, n.ease - 0.15);
    n.ivl = Math.max(1, Math.round((n.ivl || 0) * 1.2));
    n.reps += 1;
    n.due = now + n.ivl * DAY;
  } else {
    n.reps += 1;
    if (n.reps <= 1) n.ivl = 1;
    else if (n.reps === 2) n.ivl = 3;
    else n.ivl = Math.min(MAX_IVL, Math.round((n.ivl || 1) * n.ease));
    n.due = now + n.ivl * DAY;
  }

  n.last = now;
  n.seen = now;   // the old field still orders anything that hasn't been graded yet
  return n;
}

export function dueLabel(n, now) {
  now = now || Date.now();
  const diff = (n.due || 0) - now;
  if (diff <= 0) return '오늘';
  if (diff < 60 * 60 * 1000) return Math.max(1, Math.round(diff / 60000)) + '분 뒤';
  if (diff < DAY) return '오늘 안에';
  const days = Math.round(diff / DAY);
  return days === 1 ? '내일' : days + '일 뒤';
}

/* Due cards first, oldest due first. If there aren't enough, pull the ones coming up
   soonest rather than padding at random — reviewing a little early beats reviewing
   something unrelated. */
export function pickForReview(notes, n, now) {
  now = now || Date.now();
  ensureAll(notes, now);
  const due = notes.filter(x => isDue(x, now)).sort((a, b) => (a.due || 0) - (b.due || 0));
  if (due.length >= n) return due.slice(0, n);
  const rest = notes.filter(x => !isDue(x, now)).sort((a, b) => (a.due || 0) - (b.due || 0));
  return due.concat(rest.slice(0, n - due.length));
}
