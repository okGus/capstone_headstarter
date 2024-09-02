import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

interface TranscriptRequest {
    author: string;
    likes: number;
    title: string;
    description: string;
    github_link: string;
    live_link: string;
    userID: string;
    flair: string;
    skills: string[];
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

    const { title, description, userID, likes, author, flair, github_link, live_link, skills }: TranscriptRequest = await request.json();
    const id = uuidv4();

    try {
        await dynamoDbDocClient.send(new PutCommand({
            TableName: 'Posts',
            Item: {
                PostPK: `POSTS#${id}`,
                Title: title,
                Description: description,
                UserId: userID,
                Likes: likes,
                Author: author,
                Flair: flair,
                Github_Link: github_link,
                Live_Link: live_link,
                Skills: skills,
                CreatedAt: new Date().toISOString(),
            }
        }));

        return NextResponse.json({ message: 'Transcript saved successfully', }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
    }
}