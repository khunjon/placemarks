import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { authMonitor } from '../../utils/authMonitoring';
import { Colors } from '../../constants/Colors';

export const AuthDebugView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (showDebug) {
      const loadLogs = async () => {
        await authMonitor.loadLogs();
        setLogs(authMonitor.getLogs());
      };
      loadLogs();
      
      // Refresh logs every 5 seconds
      const interval = setInterval(() => {
        setLogs(authMonitor.getLogs());
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [showDebug]);

  if (!__DEV__) return null;

  if (!showDebug) {
    return (
      <TouchableOpacity 
        style={styles.toggleButton} 
        onPress={() => setShowDebug(true)}
      >
        <Text style={styles.toggleText}>🐛</Text>
      </TouchableOpacity>
    );
  }

  const summary = authMonitor.getSummary();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Auth Debug Logs</Text>
        <TouchableOpacity onPress={() => setShowDebug(false)}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Events (last hour): {summary.totalEvents}
        </Text>
        {Object.entries(summary.eventCounts).map(([event, count]) => (
          <Text key={event} style={styles.eventCount}>
            {event}: {count}
          </Text>
        ))}
      </View>

      <ScrollView style={styles.logsContainer}>
        {logs.slice(0, 20).map((log, index) => (
          <View key={index} style={styles.logEntry}>
            <Text style={styles.logTime}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </Text>
            <Text style={styles.logEvent}>{log.event}</Text>
            <Text style={styles.logDetails}>
              {JSON.stringify(log.details, null, 2)}
            </Text>
            <Text style={styles.sessionState}>
              Session: {log.sessionState.hasSession ? '✓' : '✗'} | 
              User: {log.sessionState.hasUser ? '✓' : '✗'}
              {log.sessionState.expiresIn && ` | Expires: ${log.sessionState.expiresIn}`}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  toggleText: {
    fontSize: 20,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: Colors.semantic.backgroundPrimary,
    borderTopWidth: 1,
    borderTopColor: Colors.semantic.borderPrimary,
    zIndex: 9998,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.borderPrimary,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.semantic.textPrimary,
  },
  closeText: {
    fontSize: 20,
    color: Colors.neutral[500],
  },
  summary: {
    padding: 16,
    backgroundColor: Colors.semantic.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.semantic.borderPrimary,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.textPrimary,
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginLeft: 16,
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logEntry: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.semantic.backgroundSecondary,
    borderRadius: 8,
  },
  logTime: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginBottom: 4,
  },
  logEvent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.semantic.textPrimary,
    marginBottom: 4,
  },
  logDetails: {
    fontSize: 11,
    color: Colors.neutral[700],
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  sessionState: {
    fontSize: 12,
    color: Colors.primary[500],
    marginTop: 4,
  },
});