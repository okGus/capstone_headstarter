import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const dynamoDbDocClient = DynamoDBDocumentClient.from(client);

export async function POST(request: NextRequest) {
  const { postId, userId, userName, content } = await request.json();

  if (!postId || !userId || !userName || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const commentId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    const command = new UpdateCommand({
      TableName: 'Posts',
      Key: { PostPK: postId },
      UpdateExpression: 'SET #comments = list_append(if_not_exists(#comments, :empty_list), :comment)',
      ExpressionAttributeNames: {
        '#comments': 'Comments',
      },
      ExpressionAttributeValues: {
        ':comment': [{
          CommentId: commentId,
          UserId: userId,
          UserName: userName,
          Content: content,
          CreatedAt: timestamp,
        }],
        ':empty_list': [],
      },
      ReturnValues: 'UPDATED_NEW',
    });

    await dynamoDbDocClient.send(command);

    return NextResponse.json({ success: true, commentId });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}