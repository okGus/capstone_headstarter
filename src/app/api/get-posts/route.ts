// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export async function GET() {
    const client = new DynamoDBClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
    });

    try {
        const command = new ScanCommand({
            TableName: 'Posts',
        });
        const result = await client.send(command);

        const items = result.Items || [];

        items.sort((a, b) => {
            const dateA = new Date(a.CreatedAt.S);
            const dateB = new Date(b.CreatedAt.S);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({ items });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to retrieve items' }, { status: 500 });
    }
}
