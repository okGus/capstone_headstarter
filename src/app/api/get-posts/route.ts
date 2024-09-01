import { NextResponse } from "next/server";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ScanCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const docClient = DynamoDBDocumentClient.from(client);

  try {
    const command = new ScanCommand({
      TableName: 'Posts',
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
      Comments: Array.isArray(post.Comments) ? post.Comments : []
    }));

    return NextResponse.json({ items: postsWithComments }, { status: 200,
      headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        } 
      });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to retrieve items' }, { status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      }
     });
  }
}