import type { NextApiRequest, NextApiResponse } from 'next';
import { UpdateCommand, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { NextResponse } from 'next/server';

const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  if (req.method === 'POST') {
    const { postId }: any = await req.json();

    try {
      const params: UpdateCommandInput = {
        TableName: 'Posts',
        Key: { PostPK: postId }, // Adjust key based on your schema
        UpdateExpression: 'ADD Likes :increment',
        ExpressionAttributeValues: {
            ':increment': 1,
        },
        ReturnValues: 'UPDATED_NEW',
      };

      await dynamoDbClient.send(new UpdateCommand(params));

      return NextResponse.json({ message: 'Post updated successfully' }, { status: 200 });
    } catch (error) {
      console.error('Error updating post:', error);
      return NextResponse.json({ error: 'Failed to retrieve items' }, { status: 500 });
    }
  } else {
    return NextResponse.json({ error: 'Failed to retrieve items' }, { status: 500 });
  }
}
