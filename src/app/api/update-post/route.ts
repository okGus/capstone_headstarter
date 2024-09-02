import type { NextApiRequest, NextApiResponse } from 'next';
import { UpdateCommand, GetCommand, GetCommandInput, UpdateCommandInput } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { NextResponse } from 'next/server';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoDbClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

type Post = {
    PostPK: string;
    Author: string;
    Title: string;
    Description: string;
    Github_Link: string;
    Live_Link: string;
    Likes: number;
    UserLikes: Set<string>;
    CreatedAt: string;
    Comments?: Comment[];
};

export async function POST(req: Request) {

  interface LikePostRequest {
    postId: string;
    updatedPost: Partial<Post>;
  }
  
  const { postId, updatedPost }: LikePostRequest = await req.json();

  try {
    const updateParams: UpdateCommandInput = {
      TableName: 'Posts',
      Key: { PostPK: postId },
      UpdateExpression: 'SET Title = :title, Description = :description, Github_Link = :githubLink, Live_Link = :liveLink',
      ExpressionAttributeValues: {
        ':title': updatedPost.Title,
        ':description': updatedPost.Description,
        ':githubLink': updatedPost.Github_Link,
        ':liveLink': updatedPost.Live_Link,
      },
      ReturnValues: 'UPDATED_NEW',
    };

    await dynamoDbClient.send(new UpdateCommand(updateParams));


    return NextResponse.json("Success in liking post!", { status: 200 });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}
