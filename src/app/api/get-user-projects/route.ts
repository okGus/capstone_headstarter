import { NextResponse } from "next/server";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
  }

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
  });

  const docClient = DynamoDBDocumentClient.from(client);

  try {
    const command = new ScanCommand({
      TableName: 'Posts',
      FilterExpression: 'UserId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });

    const result = await docClient.send(command);
    const items = result.Items || [];

    // Sort posts by creation date
    items.sort((a, b) => {
      const dateA = new Date(a.CreatedAt);
      const dateB = new Date(b.CreatedAt);
      return dateB.getTime() - dateA.getTime();
    });

    // Ensure Comments field exists and is an array for each post
    const postsWithComments = items.map(post => ({
      ...post,
      Comments: Array.isArray(post.Comments) ? post.Comments : [],
      UserLikes: Array.from(post.UserLikes || []),
    }));

    return NextResponse.json({ items: postsWithComments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to retrieve items' }, { status: 500 });
  }
}