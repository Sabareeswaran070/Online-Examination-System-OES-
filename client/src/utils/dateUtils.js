import { format, formatDistance, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

export const formatDateTime = (date) => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatTime = (date) => {
  return formatDate(date, 'HH:mm');
};

export const formatRelativeTime = (date) => {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return '';
  }
};

export const formatTimeBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    return formatDistance(start, end);
  } catch (error) {
    console.error('Time between formatting error:', error);
    return '';
  }
};

export const formatDuration = (minutes) => {
  if (!minutes) return '0 minutes';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins} minutes`;
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
};

export const isExamActive = (startTime, endTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  return now >= start && now <= end;
};

export const isExamUpcoming = (startTime) => {
  const now = new Date();
  const start = new Date(startTime);
  return now < start;
};

export const isExamCompleted = (endTime) => {
  const now = new Date();
  const end = new Date(endTime);
  return now > end;
};

/**
 * Compute real-time exam status based on startTime, endTime, and DB status.
 * Returns { label, variant, color } for consistent badge display.
 */
export const getExamLiveStatus = (exam) => {
  if (!exam) return { label: 'Unknown', variant: 'secondary' };

  const now = new Date();
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);
  const dbStatus = exam.status;

  // Draft and cancelled stay as-is
  if (dbStatus === 'draft') return { label: 'Draft', variant: 'secondary' };
  if (dbStatus === 'cancelled') return { label: 'Cancelled', variant: 'danger' };

  // Compute real-time status
  if (now < start) {
    return { label: 'Scheduled', variant: 'warning' };
  } else if (now >= start && now <= end) {
    return { label: 'Ongoing', variant: 'info' };
  } else {
    return { label: 'Completed', variant: 'success' };
  }
};

/**
 * Get a human-readable time-relative text for an exam.
 * e.g., "Starts in 2h 30m", "Ongoing — 45m remaining", "Ended 3 hours ago"
 */
export const getTimeRemainingText = (exam) => {
  if (!exam?.startTime || !exam?.endTime) return '';

  const now = new Date();
  const start = new Date(exam.startTime);
  const end = new Date(exam.endTime);

  const formatDiff = (ms) => {
    const totalMin = Math.floor(Math.abs(ms) / 60000);
    if (totalMin < 1) return 'less than a minute';
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(' ');
  };

  if (exam.status === 'draft') return 'Not published yet';
  if (exam.status === 'cancelled') return 'This exam has been cancelled';

  if (now < start) {
    return `Starts in ${formatDiff(start - now)}`;
  } else if (now >= start && now <= end) {
    return `Ongoing — ${formatDiff(end - now)} remaining`;
  } else {
    return `Ended ${formatDiff(now - end)} ago`;
  }
};
