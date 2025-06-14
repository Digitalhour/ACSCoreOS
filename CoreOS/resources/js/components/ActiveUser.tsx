import Echo from 'laravel-echo';
import React, { useEffect, useState } from 'react';

// Define the interface for an online user
interface OnlineUser {
    id: number;
    name: string;
    // Add any other properties you return from your Laravel channel callback
    // e.g., avatar?: string;
}

// Configure Laravel Echo for Reverb (same as before)
const echo = new Echo({
    broadcaster: 'reverb',
});

const OnlineUsers: React.FC = () => {
    // Specify the type for the onlineUsers state: an array of OnlineUser
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

    useEffect(() => {
        // Explicitly type the 'users' array and 'user' objects
        const channel = echo
            .join('online')
            .here((users: OnlineUser[]) => {
                // <-- Type here
                setOnlineUsers(users);
                console.log('Currently online:', users);
            })
            .joining((user: OnlineUser) => {
                // <-- Type here
                setOnlineUsers((prevUsers) => {
                    if (!prevUsers.some((u) => u.id === user.id)) {
                        return [...prevUsers, user];
                    }
                    return prevUsers;
                });
                console.log(user.name + ' joined.');
            })
            .leaving((user: OnlineUser) => {
                // <-- Type here
                setOnlineUsers((prevUsers) => prevUsers.filter((u) => u.id !== user.id));
                console.log(user.name + ' left.');
            })
            .error((error: any) => {
                // You might want to define a more specific error type if available
                console.error('Channel error:', error);
                if (error.type === 'WebSocketError') {
                    console.error('WebSocket connection failed. Is Reverb server running?');
                }
            });

        return () => {
            echo.leave('online');
            console.log('Left online channel.');
        };
    }, []);

    return (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '300px', margin: '20px auto' }}>
            <h2>Who's Online (via Reverb)</h2>
            {onlineUsers.length === 0 ? (
                <p>No one is online right now.</p>
            ) : (
                <ul>
                    {onlineUsers.map((user) => (
                        <li key={user.id} style={{ marginBottom: '5px' }}>
                            {user.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default OnlineUsers;
