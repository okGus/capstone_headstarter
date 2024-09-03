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
    const start = Date.now();
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    try {
        console.log(`Fetching notifications for user ${userId}`);
        const fetchStart = Date.now();
        const notifications = await redis.lrange(`notifications:${userId}`, 0, -1);
        const fetchTime = Date.now() - fetchStart;
        console.log(`Fetched ${notifications.length} notification in ${fetchTime}ms`);
        
        const parseStart = Date.now();
        const parsedNotifications = notifications
            .map(notificationString => JSON.parse(notificationString))
            .filter(isNotification);

        const parseTime = Date.now() - parseStart;
        console.log(`Fetched ${parsedNotifications.length} notification in ${parseTime}ms`);

        const totalTime = Date.now() - start;
        console.log(`Total time to fetch and parse notifications: ${totalTime}ms`);

        console.log('Sending response back to client');
        return NextResponse.json({ notifications: parsedNotifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}