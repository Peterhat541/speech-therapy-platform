import { useState, useCallback } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState(null);

  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const NotificationComponent = notification ? (
    <div className={`notification ${notification.type}`}>
      {notification.type === 'success' ? '✓' : '✕'} {notification.message}
    </div>
  ) : null;

  return { notify, NotificationComponent };
}
