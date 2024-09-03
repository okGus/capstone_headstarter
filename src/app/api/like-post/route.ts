import type { NextApiRequest, NextApiResponse } from 'next';
import { UpdateCommand, GetCommand, GetCommandInput, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { NextResponse } from 'next/server';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import redis from '@/lib/redis';

const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

interface LikePostRequest {
  postId: string;
  userId: string;
  userName: string; // For Notifications
}

export async function POST(req: Request) {
  
  const { postId, userId, userName }: LikePostRequest = await req.json();

  try {
    // Step 1: Retrieve the current UserLikes set
    const getParams: GetCommandInput = {
      TableName: 'Posts',
      Key: { PostPK: postId },
    };

    const { Item } = await dynamoDbClient.send(new GetCommand(getParams));

    if (!Item || !userId) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = Item;
    const userLikes: Set<string> = new Set(post.UserLikes || []);
    const postAuthorId = post.UserId;

    let action: 'like' | 'unlike';

    // Step 2: Check if the user is already in the UserLikes set
    if (!userLikes.has(userId)) {
      // Step 3: If not, append the userId and increment the Likes count
      const updateUserParams: UpdateCommandInput = {
        TableName: 'Posts',
        Key: { PostPK: postId },
        UpdateExpression: 'ADD UserLikes :userId',
        ExpressionAttributeValues: {
          ':userId': new Set([userId]),
        },
        ReturnValues: 'UPDATED_NEW',
      };

      const updateLikesParams: UpdateCommandInput = {
        TableName: 'Posts',
        Key: { PostPK: postId },
        UpdateExpression: 'ADD Likes :increment',
        ExpressionAttributeValues: {
          ':increment': 1,
        },
        ReturnValues: 'UPDATED_NEW',
      };

      await dynamoDbClient.send(new UpdateCommand(updateUserParams));
      await dynamoDbClient.send(new UpdateCommand(updateLikesParams));

      action = 'like';
    } else {
      // Step 4: If the user already liked the post, remove them from the UserLikes set and decrement the Likes count
      const updateUserParams: UpdateCommandInput = {
        TableName: 'Posts',
        Key: { PostPK: postId },
        UpdateExpression: 'DELETE UserLikes :userId',
        ExpressionAttributeValues: {
          ':userId': new Set([userId]),
        },
        ReturnValues: 'UPDATED_NEW',
      };

      const updateLikesParams: UpdateCommandInput = {
        TableName: 'Posts',
        Key: { PostPK: postId },
        UpdateExpression: 'ADD Likes :decrement',
        ExpressionAttributeValues: {
          ':decrement': -1,
        },
        ReturnValues: 'UPDATED_NEW',
      };

      await dynamoDbClient.send(new UpdateCommand(updateUserParams));
      await dynamoDbClient.send(new UpdateCommand(updateLikesParams));
      
      action = 'unlike';
    }

    // Step 5: Create a notification in redis
    if (action === 'like' && postAuthorId !== userId) {
      const notification = JSON.stringify({
        type: 'like',
        postId,
        likerId: userId,
        likerName: userName,
        timestamp: Date.now(),
      });

      await redis.lpush(`notifications:${postAuthorId}`, notification);
    }

    return NextResponse.json({ message: `Success in ${action === 'like' ? 'liking' : 'unliking'} post!`, action }, { status: 200 });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
