import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

interface TranscriptRequest {
    id: string;
    transcript: string;
    userId: string;
    title: string;
    content: string;
    likes: number;
}

export async function POST(request: Request) {
    // Initialize the DynamoDB client and document client
    const dynamoDbClient = new DynamoDBClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
    });

    const dynamoDbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

    const { title, content, userId, likes }: TranscriptRequest = await request.json();
    const id = uuidv4();
    try {
        await dynamoDbDocClient.send(new PutCommand({
            TableName: 'Posts',
            Item: {
                PostPK: `POSTS#${id}`,
                Title: title,
                Content: content,
                UserId: userId,
                Likes: likes,
                CreatedAt: new Date().toISOString(),
            }
        }));

        return NextResponse.json({ message: 'Transcript saved successfully', title: title, content: content, userId: userId, id: id }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
    }
}