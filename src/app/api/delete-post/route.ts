import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const dynamoDbDocClient = DynamoDBDocumentClient.from(client);

export async function DELETE(request: NextRequest) {
  const { postId } = await request.json();

  if (!postId) {
    return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
  }

  try {
    const command = new DeleteCommand({
      TableName: 'Posts',
      Key: { PostPK: postId },
    });

    await dynamoDbDocClient.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}