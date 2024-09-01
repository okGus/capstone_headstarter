import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const POSTS_QUERY_KEY = 'posts';
export const USER_POSTS_QUERY_KEY = 'userPosts';

type Comment = {
    CommentId: string;
    UserId: string;
    UserName: string;
    Content: string;
    CreatedAt: string;
};

type Post = {
    PostPK: string;
    Author: string;
    Title: string;
    Description: string;
    Link: string;
    Likes: number;
    CreatedAt: string;
    Comments?: Comment[];
};

const fetchPosts = async (): Promise<Post[]> => {
    console.log('Fetching posts'); // Debug log
    const response = await fetch('/api/get-posts');
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log('Fetched posts:', data.items); // Debug log
    return data.items;
};

const fetchUserPosts = async (userId: string): Promise<Post[]> => {
    const response = await fetch(`/api/get-user-projects?userId=${userId}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json().then(data => data.items);
};

export function usePosts(userId?: string) {
    const queryClient = useQueryClient();

    const postsQuery = useQuery({
        queryKey: [POSTS_QUERY_KEY],
        queryFn: fetchPosts,
    });

    const userPostsQuery = useQuery({
        queryKey: [USER_POSTS_QUERY_KEY, userId],
        queryFn: () => fetchUserPosts(userId!),
        enabled: !!userId,
    });

    const likePostMutation = useMutation({
        mutationFn: async (postId: string) => {
            const response = await fetch('/api/like-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId }),
            });
            if (!response.ok) {
                throw new Error('Failed to like post');
            }
            return response.json();
        },
        onSuccess: () => {
            console.log('Post liked, updating cache'); // Debug log
        },
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: [POSTS_QUERY_KEY] });
            if (userId) {
                await queryClient.cancelQueries({ queryKey: [USER_POSTS_QUERY_KEY, userId] });
            }

            const previousPosts = queryClient.getQueryData<Post[]>([POSTS_QUERY_KEY]);
            const previousUserPosts = userId ? queryClient.getQueryData<Post[]>([USER_POSTS_QUERY_KEY, userId]) : undefined;

            // Optimistically update both queries
            const updatePosts = (oldPosts: Post[] | undefined) =>
                oldPosts?.map(post =>
                    post.PostPK === postId ? { ...post, Likes: post.Likes + 1 } : post
                ) || [];

            queryClient.setQueryData([POSTS_QUERY_KEY], updatePosts);
            if (userId) {
                queryClient.setQueryData([USER_POSTS_QUERY_KEY, userId], updatePosts);
            }

            return { previousPosts, previousUserPosts };
        },
        onError: (err, postId, context) => {
            queryClient.setQueryData([POSTS_QUERY_KEY], context?.previousPosts);
            if (userId) {
                queryClient.setQueryData([USER_POSTS_QUERY_KEY, userId], context?.previousUserPosts);
            }
        },
        onSettled: (data, error, postId) => {
            // Update the cache with the actual server response
            if (data) {
                queryClient.setQueryData<Post[]>([POSTS_QUERY_KEY], oldPosts =>
                    oldPosts?.map(post =>
                        post.PostPK === postId ? { ...post, Likes: data.likes } : post
                    ) || []
                );
                if (userId) {
                    queryClient.setQueryData<Post[]>([USER_POSTS_QUERY_KEY, userId], oldPosts =>
                        oldPosts?.map(post =>
                            post.PostPK === postId ? { ...post, Likes: data.likes } : post
                        ) || []
                    );
                }
            }
            queryClient.invalidateQueries({ queryKey: [POSTS_QUERY_KEY] });
            if (userId) {
                queryClient.invalidateQueries({ queryKey: [USER_POSTS_QUERY_KEY, userId] });
            }
        },
    });


    const addCommentMutation = useMutation({
        mutationFn: (commentData: {
            postId: string;
            userId: string;
            userName: string;
            content: string;
        }) =>
            fetch("/api/add-comment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(commentData),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [POSTS_QUERY_KEY] });
            if (userId) {
                queryClient.invalidateQueries({ queryKey: [USER_POSTS_QUERY_KEY, userId] });
            }
        },
    });

    const createPostMutation = useMutation({
        mutationFn: (newPost: any) =>
            fetch('/api/save-posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPost),
            }),
        onSuccess: (data, variables) => {
            console.log('Post created, updating cache'); // Debug log

            // Assume the API returns the created post
            const createdPost = data;

            // Update the posts cache
            queryClient.setQueryData<any[]>([POSTS_QUERY_KEY], (oldPosts) => {
                return oldPosts ? [createdPost, ...oldPosts] : [createdPost];
            });

            // If we have a userId, also update the user posts cache
            if (userId) {
                queryClient.setQueryData<any[]>([USER_POSTS_QUERY_KEY, userId], (oldPosts) => {
                    return oldPosts ? [createdPost, ...oldPosts] : [createdPost];
                });
            }

            // Invalidate queries to ensure data consistency
            queryClient.invalidateQueries({ queryKey: [POSTS_QUERY_KEY] });
            if (userId) {
                queryClient.invalidateQueries({ queryKey: [USER_POSTS_QUERY_KEY, userId] });
            }
        },
    });

    return {
        posts: postsQuery.data,
        userPosts: userPostsQuery.data,
        isLoading: postsQuery.isLoading || userPostsQuery.isLoading,
        error: postsQuery.error || userPostsQuery.error,
        likePost: likePostMutation.mutate,
        addComment: addCommentMutation.mutate,
        createPost: createPostMutation.mutate,
    };
}