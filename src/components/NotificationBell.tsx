import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing } from 'lucide-react';
import UserNotifications from './UserNotifications';

interface NotificationBellProps {
  userId?: string;
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId, className = '' }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const fetchUnreadCount = async () => {
    if (!userId || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/count', {
        headers: {
          'user-id': userId,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (!userId) {
      console.warn('No user ID provided for notifications');
      return;
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Refresh count after closing notifications
    setTimeout(() => {
      fetchUnreadCount();
    }, 500);
  };

  if (!userId) {
    return null; // Don't show bell if no user
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className={`relative p-2 ${className}`}
        disabled={isLoading}
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-blue-600" />
        ) : (
          <Bell className="h-5 w-5 text-gray-600" />
        )}
        
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      <UserNotifications
        userId={userId}
        isOpen={isOpen}
        onClose={handleClose}
      />
    </>
  );
};

export default NotificationBell;
