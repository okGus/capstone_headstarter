import redis from "@/lib/redis";
import { NextRequest, NextResponse } from "next/server";

interface Notification {
    type: string;
    postId: string;
    likerId: string;
    likerName: string;
    timestamp: number;
}

function isNotification(obj: any): obj is Notification {
    return typeof obj === 'object' &&
           typeof obj.type === 'string' &&
           typeof obj.postId === 'string' &&
           typeof obj.likerId === 'string' &&
           typeof obj.likerName === 'string' &&
           typeof obj.timestamp === 'number';
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    try {
        const notifications = await redis.lrange(`notifications:${userId}`, 0, -1);
        const parsedNotifications = notifications
            .map(notificationString => JSON.parse(notificationString))
            .filter(isNotification);

        return NextResponse.json({ notifications: parsedNotifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}