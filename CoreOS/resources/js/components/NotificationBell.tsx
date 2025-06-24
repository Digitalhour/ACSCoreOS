import React, {useEffect, useState} from 'react';
import {Bell} from 'lucide-react';
import axios from 'axios';
import {useEcho} from '@laravel/echo-react';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const response = await axios.get('/api/notifications');
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    // 🔥 Official Laravel 12 useEcho hook
    // Only subscribe if the user is a manager
    // Assumes `window.user.is_manager` is available
    if (window.user?.is_manager) {
        useEcho(
            `pto-requests.manager.${window.user?.id}`,
            'PtoRequestSubmitted',
            (e) => {
                console.log('Real-time PTO notification received:', e);

                // Refresh notifications to get the latest
                fetchNotifications();

                // Show browser notification if permission granted
                if (Notification.permission === 'granted') {
                    new Notification(e.notification.title, {
                        body: e.notification.message,
                        icon: '/favicon.ico'
                    });
                }
            }
        );
    }


    // Request browser notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.post(`/api/notifications/${id}/read`);
            fetchNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <div className="relative">
            {/* ... (rest of your JSX is fine) ... */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg"
            >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b font-semibold">Notifications</div>
                    {notifications.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">No notifications</div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                                    !notification.read_at ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div className="font-medium text-sm">{notification.title}</div>
                                <div className="text-gray-600 text-sm">{notification.message}</div>
                                <div className="text-gray-400 text-xs mt-1">
                                    {new Date(notification.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
