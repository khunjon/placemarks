import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { ErrorLogger, ErrorFactory } from '../utils/errorHandling';

interface NetworkStatusListener {
  (isConnected: boolean, state: NetInfoState): void;
}

class NetworkService {
  private listeners: Set<NetworkStatusListener> = new Set();
  private subscription: NetInfoSubscription | null = null;
  private currentState: NetInfoState | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the network monitoring service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get initial state
      this.currentState = await NetInfo.fetch();
      this.isInitialized = true;

      // Subscribe to network state changes
      this.subscription = NetInfo.addEventListener((state) => {
        const previousIsConnected = this.currentState?.isConnected;
        this.currentState = state;

        // Notify listeners only if connection state changed
        if (previousIsConnected !== state.isConnected) {
          this.notifyListeners(state.isConnected ?? false, state);
        }
      });

      console.log('Network service initialized. Connected:', this.currentState.isConnected);
    } catch (error) {
      ErrorLogger.log(
        ErrorFactory.network(
          'Failed to initialize network monitoring',
          { service: 'network', operation: 'initialize' },
          error as Error
        )
      );
    }
  }

  /**
   * Clean up network monitoring
   */
  dispose(): void {
    if (this.subscription) {
      this.subscription();
      this.subscription = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }

  /**
   * Get current network connection status
   */
  isConnected(): boolean {
    return this.currentState?.isConnected ?? true; // Default to true if unknown
  }

  /**
   * Get current network state
   */
  getState(): NetInfoState | null {
    return this.currentState;
  }

  /**
   * Check if network is available (with optional retry)
   */
  async checkConnection(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      this.currentState = state;
      return state.isConnected ?? false;
    } catch (error) {
      ErrorLogger.log(
        ErrorFactory.network(
          'Failed to check network connection',
          { service: 'network', operation: 'checkConnection' },
          error as Error
        )
      );
      return false;
    }
  }

  /**
   * Add a listener for network status changes
   */
  addListener(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Wait for network to become available
   */
  async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isConnected()) return true;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, timeoutMs);

      const cleanup = this.addListener((isConnected) => {
        if (isConnected) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(true);
        }
      });

      // Check once more in case connection was restored before listener was added
      this.checkConnection().then((isConnected) => {
        if (isConnected) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(true);
        }
      });
    });
  }

  /**
   * Execute an operation with network check
   */
  async withNetworkCheck<T>(
    operation: () => Promise<T>,
    options: {
      waitForNetwork?: boolean;
      waitTimeout?: number;
      errorMessage?: string;
    } = {}
  ): Promise<T> {
    const {
      waitForNetwork = true,
      waitTimeout = 10000,
      errorMessage = 'No network connection available'
    } = options;

    // Check current connection
    let isConnected = this.isConnected();

    // If not connected and should wait, try to wait for connection
    if (!isConnected && waitForNetwork) {
      isConnected = await this.waitForConnection(waitTimeout);
    }

    if (!isConnected) {
      throw ErrorFactory.network(
        errorMessage,
        { 
          service: 'network', 
          operation: 'withNetworkCheck',
          metadata: { waitForNetwork, waitTimeout }
        }
      );
    }

    return operation();
  }

  private notifyListeners(isConnected: boolean, state: NetInfoState): void {
    this.listeners.forEach(listener => {
      try {
        listener(isConnected, state);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }
}

// Export singleton instance
export const networkService = new NetworkService();

// Auto-initialize on import
networkService.initialize().catch(console.error);