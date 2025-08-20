import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock } from 'lucide-react';

interface BackendConnectionStatusProps {
  className?: string;
}

export default function BackendConnectionStatus({ className }: BackendConnectionStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch (error) {
      setStatus('disconnected');
    }
    setLastCheck(new Date());
  };

  useEffect(() => {
    // Initial check
    checkBackendStatus();

    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV === 'production') {
    // Don't show in production
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Backend Connected',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-300'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Backend Offline',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-300'
        };
      case 'checking':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: 'Checking...',
          variant: 'outline' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className}`}
      title={lastCheck ? `Last checked: ${lastCheck.toLocaleTimeString()}` : 'Checking backend status...'}
    >
      {config.icon}
      <span className="text-xs ml-1">{config.text}</span>
    </Badge>
  );
}
