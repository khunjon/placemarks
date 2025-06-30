export interface OpeningPeriod {
  open: {
    day: number;  // 0-6 (Sunday-Saturday)
    time: string; // HHMM format (e.g., "0900", "1430")
  };
  close?: {
    day: number;
    time: string;
  };
}

export interface OpeningHours {
  periods?: OpeningPeriod[];
  weekday_text?: string[];
}

export interface PlaceLocation {
  lat: number;
  lng: number;
}

/**
 * Simple timezone detection based on coordinates
 * Returns common timezone identifiers for major regions
 */
export function getPlaceTimezone(location: PlaceLocation): string {
  const { lat, lng } = location;
  
  // Thailand (primary use case)
  if (lat >= 5.5 && lat <= 20.5 && lng >= 97.0 && lng <= 106.0) {
    return 'Asia/Bangkok';
  }
  
  // Japan
  if (lat >= 24.0 && lat <= 46.0 && lng >= 123.0 && lng <= 146.0) {
    return 'Asia/Tokyo';
  }
  
  // Singapore
  if (lat >= 1.0 && lat <= 2.0 && lng >= 103.0 && lng <= 105.0) {
    return 'Asia/Singapore';
  }
  
  // Malaysia
  if (lat >= 0.5 && lat <= 7.5 && lng >= 99.0 && lng <= 120.0) {
    return 'Asia/Kuala_Lumpur';
  }
  
  // Vietnam
  if (lat >= 8.0 && lat <= 24.0 && lng >= 102.0 && lng <= 110.0) {
    return 'Asia/Ho_Chi_Minh';
  }
  
  // Philippines
  if (lat >= 4.0 && lat <= 21.0 && lng >= 116.0 && lng <= 127.0) {
    return 'Asia/Manila';
  }
  
  // Indonesia
  if (lat >= -11.0 && lat <= 6.0 && lng >= 95.0 && lng <= 141.0) {
    if (lng <= 120.0) return 'Asia/Jakarta';
    return 'Asia/Makassar';
  }
  
  // USA (rough zones)
  if (lat >= 24.0 && lat <= 49.0 && lng >= -125.0 && lng <= -66.0) {
    if (lng >= -90.0) return 'America/New_York';
    if (lng >= -105.0) return 'America/Chicago';
    if (lng >= -120.0) return 'America/Denver';
    return 'America/Los_Angeles';
  }
  
  // Europe (rough zones)
  if (lat >= 35.0 && lat <= 71.0 && lng >= -10.0 && lng <= 40.0) {
    if (lng <= 15.0) return 'Europe/London';
    return 'Europe/Berlin';
  }
  
  // Australia
  if (lat >= -44.0 && lat <= -10.0 && lng >= 113.0 && lng <= 154.0) {
    if (lng <= 130.0) return 'Australia/Perth';
    if (lng <= 142.0) return 'Australia/Adelaide';
    return 'Australia/Sydney';
  }
  
  // Default fallback
  console.warn('Unknown timezone for coordinates:', location);
  return 'UTC';
}

/**
 * Get user's device timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to get user timezone:', error);
    return 'UTC';
  }
}

/**
 * Convert time string (HHMM) to minutes from midnight
 */
function timeToMinutes(timeString: string): number {
  const hours = parseInt(timeString.substring(0, 2), 10);
  const minutes = parseInt(timeString.substring(2, 4), 10);
  return hours * 60 + minutes;
}

/**
 * Get current day of week and time in minutes for a specific timezone
 */
function getCurrentDayAndTime(timezone: string): { day: number; minutes: number } {
  try {
    const now = new Date();
    
    // Use formatToParts for reliable parsing
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(now);
    
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024', 10);
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
    const dayOfMonth = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    
    // Create a date object for the specific date in the timezone
    // Note: month is 0-indexed in Date constructor
    const dateInTimezone = new Date(year, month - 1, dayOfMonth);
    const day = dateInTimezone.getDay(); // Sunday = 0, which matches Google Places format
    
    const minutes = hour * 60 + minute;

    return { day, minutes };
  } catch (error) {
    console.warn('Failed to get current time in timezone:', timezone, error);
    // Fallback to UTC
    const now = new Date();
    const day = now.getUTCDay(); // Sunday = 0
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    return { day, minutes };
  }
}

/**
 * Check if a place is currently open based on opening hours and timezone
 */
export function isPlaceCurrentlyOpen(
  openingHours: OpeningHours | null | undefined,
  location: PlaceLocation,
  placeTimezone?: string
): boolean | null {
  // Return null if we don't have enough data
  if (!openingHours?.periods || openingHours.periods.length === 0) {
    return null;
  }

  try {
    // Determine place timezone
    const timezone = placeTimezone || getPlaceTimezone(location);
    
    // Get current day and time in place timezone
    const { day: currentDay, minutes: currentMinutes } = getCurrentDayAndTime(timezone);

    // Check if place is open now
    for (const period of openingHours.periods) {
      const openDay = period.open.day;
      const openMinutes = timeToMinutes(period.open.time);
      
      // Handle 24-hour places (no close time)
      if (!period.close) {
        if (openDay === currentDay) {
          return currentMinutes >= openMinutes;
        }
        continue;
      }

      const closeDay = period.close.day;
      const closeMinutes = timeToMinutes(period.close.time);

      // Handle same-day opening hours
      if (openDay === closeDay) {
        if (currentDay === openDay && currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
          return true;
        }
      }
      // Handle overnight hours (e.g., open Friday 22:00, close Saturday 02:00)
      else {
        // Check if we're in the opening day after opening time
        if (currentDay === openDay && currentMinutes >= openMinutes) {
          return true;
        }
        // Check if we're in the closing day before closing time
        if (currentDay === closeDay && currentMinutes < closeMinutes) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking if place is open:', error);
    return null;
  }
}

/**
 * Get formatted opening hours text for a specific day
 */
export function getFormattedHoursForDay(
  openingHours: OpeningHours | null | undefined,
  dayIndex: number = new Date().getDay()
): string {
  if (!openingHours?.weekday_text || openingHours.weekday_text.length === 0) {
    return 'Hours not available';
  }

  try {
    // Google Places weekday_text uses Monday=0, but JavaScript Date uses Sunday=0
    // So we need to adjust the index
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return openingHours.weekday_text[adjustedIndex] || 'Hours not available';
  } catch (error) {
    console.warn('Error formatting hours for day:', error);
    return 'Hours not available';
  }
}

/**
 * Get all opening hours as formatted text array
 */
export function getAllFormattedHours(openingHours: OpeningHours | null | undefined): string[] {
  if (!openingHours?.weekday_text || openingHours.weekday_text.length === 0) {
    return ['Hours not available'];
  }

  return openingHours.weekday_text;
}

/**
 * Check if a place has valid opening hours data
 */
export function hasValidOpeningHours(openingHours: OpeningHours | null | undefined): boolean {
  return !!(
    openingHours && 
    (
      (openingHours.periods && openingHours.periods.length > 0) ||
      (openingHours.weekday_text && openingHours.weekday_text.length > 0)
    )
  );
}