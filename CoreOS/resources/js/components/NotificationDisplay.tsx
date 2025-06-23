import React, {useEffect, useState} from 'react';

export default function NotificationDisplay() {
    const [notification, setNotification] = useState('');

    useEffect(() => {
        // Listen on the 'test-channel' for the 'RealTimeMessage' event
        window.Echo.channel('test-channel')
            .listen('RealTimeMessage', (event) => {
                console.log('Event received:', event); // For debugging
                setNotification(event.message);

                // Optional: Clear the notification after a few seconds
                setTimeout(() => {
                    setNotification('');
                }, 5000);
            });

        // Clean up the listener when the component unmounts
        return () => {
            window.Echo.channel('test-channel').stopListening('RealTimeMessage');
        };
    }, []); // Empty dependency array ensures this runs only once

    return (
        <div className="fixed top-5 right-5 z-50">
            {notification && (
                <div className="px-6 py-4 bg-green-500 text-white rounded-lg shadow-lg animate-bounce">
                    <strong>New Notification:</strong> {notification}
                </div>
            )}
        </div>
    );
}
