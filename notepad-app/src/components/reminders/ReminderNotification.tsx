import React, { useEffect } from 'react';

interface ReminderNotificationProps {
  reminder: { id: string; title: string; body: string };
  onClose: () => void;
}

export default function ReminderNotification({ reminder, onClose }: ReminderNotificationProps) {
  // Auto-close after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="reminder-notification" id={`notification-${reminder.id}`}>
      <div className="notification-header">
        <span className="notification-icon">⏰</span>
        <span className="notification-title">{reminder.title}</span>
        <button className="notification-close" onClick={onClose}>✕</button>
      </div>
      {reminder.body && (
        <div className="notification-body">{reminder.body}</div>
      )}
    </div>
  );
}
