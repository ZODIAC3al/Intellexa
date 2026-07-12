import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../utils/api';
import { toast } from 'react-toastify';

export default function NotificationBell() {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification marked as read');
    },
    onError: () => {
      toast.error('Failed to mark notification as read');
    },
  });

  useEffect(() => {
    if (unreadCount > 0) {
      const timer = setTimeout(() => {
        toast.info(`${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`, {
          position: 'top-right',
          autoClose: 2000,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle relative">
        <Bell className="h-5 w-5 text-neutral-content" />
        {unreadCount > 0 && (
          <span className="badge badge-error badge-xs absolute top-2 right-2 animate-pulse">
            {unreadCount}
          </span>
        )}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content z-50 menu p-2 shadow-xl bg-base-300 rounded-box w-80 max-h-96 overflow-y-auto border border-neutral/60 gap-1.5 mt-2"
      >
        <li className="menu-title text-base-content font-bold px-3 py-1">Notifications</li>
        <hr className="border-neutral" />
        {notifications.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-content">No notifications yet</div>
        ) : (
          notifications.map((notif) => (
            <li
              key={notif._id}
              onClick={() => markReadMutation.mutate(notif._id)}
              className={`p-2.5 rounded-lg flex flex-col items-start gap-1 cursor-pointer transition-colors ${
                notif.read ? 'bg-transparent hover:bg-base-200' : 'bg-primary/10 hover:bg-primary/15'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-semibold text-xs text-base-content">{notif.title}</span>
                {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-error" />}
              </div>
              <p className="text-[11px] text-neutral-content leading-relaxed">{notif.message}</p>
              <span className="text-[9px] font-mono text-neutral-content/60 mt-1">
                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}