import * as chrono from 'chrono-node';

export interface ResolvedTimeRange {
  rawExpression: string;
  startDate: Date;
  endDate: Date;
  formattedLabel: string;
  isPastReference: boolean;
}

/**
 * Temporal Resolver: parses relative and absolute temporal expressions
 * against an anchor date (defaulting to now or evaluation reference time).
 */
export function resolveTemporalReference(
  text: string,
  referenceDate: Date = new Date()
): ResolvedTimeRange | null {
  // Use chrono-node to extract temporal mentions
  const parsed = chrono.parse(text, referenceDate, { forwardDate: false });
  if (!parsed || parsed.length === 0) {
    return null;
  }

  const result = parsed[0];
  const start = result.start.date();
  
  // Normalize start to beginning of day if hour wasn't explicitly specified
  const isTimeSpecified = result.start.isCertain('hour');
  const startDate = new Date(start);
  if (!isTimeSpecified) {
    startDate.setHours(0, 0, 0, 0);
  }

  let endDate: Date;
  if (result.end) {
    endDate = result.end.date();
    if (!result.end.isCertain('hour')) {
      endDate.setHours(23, 59, 59, 999);
    }
  } else {
    // Single point in time -> full day span
    endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const isPast = endDate.getTime() <= referenceDate.getTime();

  return {
    rawExpression: result.text,
    startDate,
    endDate,
    formattedLabel: formatDateRange(startDate, endDate),
    isPastReference: isPast
  };
}

function formatDateRange(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  // If within the same day
  if (start.toDateString() === end.toDateString()) {
    return startStr;
  }

  const endStr = end.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `${startStr} to ${endStr}`;
}
