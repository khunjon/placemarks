import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_LOG_KEY = '@placemarks/auth_logs';
const MAX_LOG_ENTRIES = 50;

interface AuthLogEntry {
  timestamp: string;
  event: string;
  details: Record<string, any>;
  sessionState: {
    hasSession: boolean;
    hasUser: boolean;
    expiresAt?: number;
    expiresIn?: string;
  };
}

class AuthMonitor {
  private logs: AuthLogEntry[] = [];
  
  async logEvent(event: string, details: Record<string, any>, session?: Session | null) {
    const now = new Date();
    const entry: AuthLogEntry = {
      timestamp: now.toISOString(),
      event,
      details,
      sessionState: {
        hasSession: !!session,
        hasUser: !!session?.user,
        expiresAt: session?.expires_at,
        expiresIn: session?.expires_at 
          ? `${Math.floor((session.expires_at - Math.floor(Date.now() / 1000)) / 60)} minutes`
          : undefined
      }
    };
    
    // Add to in-memory logs
    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(0, MAX_LOG_ENTRIES);
    }
    
    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(AUTH_LOG_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to persist auth logs:', error);
    }
    
    // Only log critical auth events to console in development to reduce verbosity
    const criticalEvents = [
      'auth_error',
      'sign_in_success', 
      'sign_out_success',
      'token_refresh_failed',
      'session_expired'
    ];
    
    if (__DEV__ && criticalEvents.includes(event)) {
      console.log(`🔐 AUTH: ${event}`, {
        ...details,
        sessionState: entry.sessionState
      });
    }
  }
  
  async loadLogs() {
    try {
      const stored = await AsyncStorage.getItem(AUTH_LOG_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load auth logs:', error);
    }
  }
  
  getLogs(): AuthLogEntry[] {
    return [...this.logs];
  }
  
  getRecentEvents(minutes: number = 60): AuthLogEntry[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => new Date(log.timestamp) > cutoff);
  }
  
  async clearLogs() {
    this.logs = [];
    try {
      await AsyncStorage.removeItem(AUTH_LOG_KEY);
    } catch (error) {
      console.warn('Failed to clear auth logs:', error);
    }
  }
  
  getSummary() {
    const recent = this.getRecentEvents(60);
    const eventCounts: Record<string, number> = {};
    
    recent.forEach(log => {
      eventCounts[log.event] = (eventCounts[log.event] || 0) + 1;
    });
    
    return {
      totalEvents: recent.length,
      eventCounts,
      lastEvent: this.logs[0],
      oldestEvent: this.logs[this.logs.length - 1]
    };
  }
}

export const authMonitor = new AuthMonitor();