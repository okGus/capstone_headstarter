'use client';
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type Notifications = {
    type: string;
    postId: string;
    likerId: string;
    likerName: string;
    timestamp: number;
};

const fetchNotifications = async (userId: string): Promise<Notifications[]> => {
    const response = await fetch(`/api/get-notifications?userId=${userId}`);
    console.log('huh');
    if (!response.ok) {
        throw new Error('Failed to fetch notificatiosn');
    }

    const data = await response.json();
    return data.notifications;
};

export default function Notifications({ userId }: { userId: string }) {
    const [isOpen, setIsOpen] = useState(false);

    const { data: notifications, isLoading, error } = useQuery<Notifications[]>({
        queryKey: ['notifications', userId],
        queryFn: () => fetchNotifications(userId),
        enabled: !!userId,
    });

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">
                Notifications
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white shadow-xl rounded-lg overflow-hidden z-10">
                    {isLoading && <p className="p-4">Loading notifications...</p>}
                    {error && <p className="p-4 text-red-500">Error loading notifications</p>}
                    {notifications && notifications.length === 0 && (
                        <p className="p-4">No new notifications</p>
                    )}
                    {notifications && notifications.map((notification, index) => (
                        <div key={index} className="p-4 border-b">
                            <p>{notification.likerName} liked your post</p>
                            <p className="text-sm text-gray-500">
                                {new Date(notification.timestamp).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}