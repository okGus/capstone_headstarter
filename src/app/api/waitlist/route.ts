import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

export async function POST(request: Request) {
    // Initialize the DynamoDB client and document client
    const dynamoDbClient = new DynamoDBClient({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
    });

    const { name, email } = await request.json();

    if (!name || !email) {
        return NextResponse.json({ message: 'Name and Email are required.' }, { status: 400 });
    }

    const dynamoDbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

    const params = {
        TableName: 'Waitlist',
        Item: {
            email: email.toLowerCase(),
            name,
            createdAt: new Date().toISOString(),
        }
    }

    try {
        await dynamoDbDocClient.send(new PutCommand(params));
        return NextResponse.json({ message: 'You have been added to the waitlist.' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal Server Error.' }, { status: 500 });
    }
}