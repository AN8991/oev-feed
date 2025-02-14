import { UserPosition } from '@/types/protocols';
import { log } from '@/utils/logger';

export type NotificationLevel = 'info' | 'warning' | 'danger';
export type PositionChangeType = 'collateral' | 'debt' | 'healthFactor';

export interface Notification {
  id: string;
  timestamp: number;
  level: NotificationLevel;
  title: string;
  message: string;
  read: boolean;
}

interface PositionChange {
  type: PositionChangeType;
  previousValue: string;
  newValue: string;
  percentageChange: number;
}

interface NotificationThresholds {
  readonly HEALTH_FACTOR: {
    readonly DANGER: number;
    readonly WARNING: number;
  };
  readonly POSITION_CHANGE: {
    readonly SIGNIFICANT: number;
    readonly MAJOR: number;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[];
  private subscribers: Set<(notifications: Notification[]) => void>;
  private readonly MAX_NOTIFICATIONS = 100;

  private readonly THRESHOLDS: NotificationThresholds = {
    HEALTH_FACTOR: {
      DANGER: 1.1,
      WARNING: 1.5,
    },
    POSITION_CHANGE: {
      SIGNIFICANT: 10, // 10% change
      MAJOR: 25, // 25% change
    },
  };

  private constructor() {
    this.notifications = [];
    this.subscribers = new Set();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private addNotification(
    level: NotificationLevel,
    title: string,
    message: string
  ): void {
    try {
      if (!title || !message) {
        throw new Error('Notification title and message are required');
      }

      const notification: Notification = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        level,
        title,
        message,
        read: false,
      };

      this.notifications.unshift(notification);

      // Keep only the latest notifications
      if (this.notifications.length > this.MAX_NOTIFICATIONS) {
        this.notifications = this.notifications.slice(0, this.MAX_NOTIFICATIONS);
      }

      this.notifySubscribers();
    } catch (error) {
      log.error('Error adding notification:', error);
      throw error;
    }
  }

  private calculatePercentageChange(previous: string, current: string): number {
    try {
      const prev = parseFloat(previous);
      const curr = parseFloat(current);

      if (isNaN(prev) || isNaN(curr)) {
        throw new Error('Invalid number format for percentage calculation');
      }

      if (prev === 0) {
        return curr === 0 ? 0 : 100; // Handle division by zero
      }

      return ((curr - prev) / prev) * 100;
    } catch (error) {
      log.error('Error calculating percentage change:', error);
      throw error;
    }
  }

  private detectPositionChanges(
    previousPosition: UserPosition,
    currentPosition: UserPosition
  ): PositionChange[] {
    try {
      const changes: PositionChange[] = [];
      const fields: PositionChangeType[] = ['collateral', 'debt', 'healthFactor'];

      fields.forEach(field => {
        const prevValue = previousPosition[field];
        const currValue = currentPosition[field];

        if (!prevValue || !currValue) {
          log.warn(`Missing ${field} value in position`, { previousPosition, currentPosition });
          return;
        }

        const percentageChange = this.calculatePercentageChange(prevValue, currValue);
        if (Math.abs(percentageChange) >= this.THRESHOLDS.POSITION_CHANGE.SIGNIFICANT) {
          changes.push({
            type: field,
            previousValue: prevValue,
            newValue: currValue,
            percentageChange,
          });
        }
      });

      return changes;
    } catch (error) {
      log.error('Error detecting position changes:', error);
      throw error;
    }
  }

  checkPositionHealth(position: UserPosition): void {
    try {
      if (!position.healthFactor) {
        throw new Error('Health factor is required');
      }

      const healthFactor = parseFloat(position.healthFactor);
      if (isNaN(healthFactor)) {
        throw new Error('Invalid health factor format');
      }

      if (healthFactor <= this.THRESHOLDS.HEALTH_FACTOR.DANGER) {
        this.addNotification(
          'danger',
          'Critical Health Factor',
          `Your position's health factor is critically low at ${healthFactor.toFixed(2)}. Consider adding collateral or repaying debt immediately.`
        );
      } else if (healthFactor <= this.THRESHOLDS.HEALTH_FACTOR.WARNING) {
        this.addNotification(
          'warning',
          'Low Health Factor',
          `Your position's health factor is low at ${healthFactor.toFixed(2)}. Consider adjusting your position.`
        );
      }
    } catch (error) {
      log.error('Error checking position health:', error);
      throw error;
    }
  }

  notifyPositionChanges(
    previousPosition: UserPosition,
    currentPosition: UserPosition
  ): void {
    try {
      const changes = this.detectPositionChanges(previousPosition, currentPosition);

      changes.forEach(change => {
        const absChange = Math.abs(change.percentageChange);
        const level: NotificationLevel = 
          absChange >= this.THRESHOLDS.POSITION_CHANGE.MAJOR ? 'warning' : 'info';

        const direction = change.percentageChange > 0 ? 'increased' : 'decreased';
        
        this.addNotification(
          level,
          `${change.type.charAt(0).toUpperCase() + change.type.slice(1)} Change Detected`,
          `Your ${change.type} has ${direction} by ${absChange.toFixed(2)}% from ${change.previousValue} to ${change.newValue}.`
        );
      });

      // Always check health factor
      this.checkPositionHealth(currentPosition);
    } catch (error) {
      log.error('Error notifying position changes:', error);
      throw error;
    }
  }

  subscribe(callback: (notifications: Notification[]) => void): void {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Invalid callback function');
    }
    this.subscribers.add(callback);
    callback([...this.notifications]); // Send copy of notifications
  }

  unsubscribe(callback: (notifications: Notification[]) => void): void {
    if (!callback) {
      throw new Error('Callback is required for unsubscribe');
    }
    this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    const notificationsCopy = [...this.notifications]; // Send copy to prevent mutations
    this.subscribers.forEach(callback => {
      try {
        callback(notificationsCopy);
      } catch (error) {
        log.error('Error in notification subscriber:', error);
      }
    });
  }

  markAsRead(notificationId: string): void {
    try {
      if (!notificationId) {
        throw new Error('Notification ID is required');
      }

      const notification = this.notifications.find(n => n.id === notificationId);
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }

      notification.read = true;
      this.notifySubscribers();
    } catch (error) {
      log.error('Error marking notification as read:', error);
      throw error;
    }
  }

  markAllAsRead(): void {
    try {
      this.notifications.forEach(n => (n.read = true));
      this.notifySubscribers();
    } catch (error) {
      log.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  clearAll(): void {
    try {
      this.notifications = [];
      this.notifySubscribers();
    } catch (error) {
      log.error('Error clearing notifications:', error);
      throw error;
    }
  }

  getUnreadCount(): number {
    try {
      return this.notifications.filter(n => !n.read).length;
    } catch (error) {
      log.error('Error getting unread count:', error);
      throw error;
    }
  }
}
