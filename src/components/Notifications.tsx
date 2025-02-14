import { useEffect, useState } from 'react';
import { Notification, NotificationService } from '@/services/notifications';

const NotificationItem = ({ notification, onMarkRead }: { 
  notification: Notification;
  onMarkRead: (id: string) => void;
}) => {
  const getBgColor = () => {
    switch (notification.level) {
      case 'danger': return 'bg-red-100 dark:bg-red-900/30';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'info': return 'bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const getTextColor = () => {
    switch (notification.level) {
      case 'danger': return 'text-red-800 dark:text-red-200';
      case 'warning': return 'text-yellow-800 dark:text-yellow-200';
      case 'info': return 'text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div className={`p-4 mb-2 rounded-lg ${getBgColor()} ${!notification.read ? 'border-l-4 border-current' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-semibold ${getTextColor()}`}>{notification.title}</h4>
          <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{notification.message}</p>
          <span className="text-xs text-gray-500 mt-2 block">
            {new Date(notification.timestamp).toLocaleString()}
          </span>
        </div>
        {!notification.read && (
          <button
            onClick={() => onMarkRead(notification.id)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Mark as read
          </button>
        )}
      </div>
    </div>
  );
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    const handleNotifications = (updatedNotifications: Notification[]) => {
      setNotifications(updatedNotifications);
    };

    notificationService.subscribe(handleNotifications);
    return () => notificationService.unsubscribe(handleNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    notificationService.clearAll();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Notifications
              </h3>
              <div className="space-x-2">
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Mark all read
                </button>
                <button
                  onClick={handleClearAll}
                  className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto p-4">
            {notifications.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No notifications
              </p>
            ) : (
              notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
