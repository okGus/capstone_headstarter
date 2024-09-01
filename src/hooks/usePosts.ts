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
    const response = await fetch('/api/get-posts');
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json().then(data => data.items);
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
        mutationFn: (postId: string) =>
            fetch('/api/like-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId }),
            }),
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: [POSTS_QUERY_KEY] });
            if (userId) {
                await queryClient.cancelQueries({ queryKey: [USER_POSTS_QUERY_KEY, userId] });
            }

            const previousPosts = queryClient.getQueryData([POSTS_QUERY_KEY]);
            const previousUserPosts = userId ? queryClient.getQueryData([USER_POSTS_QUERY_KEY, userId]) : undefined;

            // Update both queries optimistically
            queryClient.setQueryData([POSTS_QUERY_KEY], (old: Post[] | undefined) =>
                old ? old.map(post => post.PostPK === postId ? { ...post, Likes: post.Likes + 1 } : post) : []
            );

            if (userId) {
                queryClient.setQueryData([USER_POSTS_QUERY_KEY, userId], (old: Post[] | undefined) =>
                    old ? old.map(post => post.PostPK === postId ? { ...post, Likes: post.Likes + 1 } : post) : []
                );
            }

            return { previousPosts, previousUserPosts };
        },
        onError: (err, postId, context) => {
            queryClient.setQueryData([POSTS_QUERY_KEY], context?.previousPosts);
            if (userId) {
                queryClient.setQueryData([USER_POSTS_QUERY_KEY, userId], context?.previousUserPosts);
            }
        },
        onSettled: () => {
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

    return {
        posts: postsQuery.data,
        userPosts: userPostsQuery.data,
        isLoading: postsQuery.isLoading || userPostsQuery.isLoading,
        error: postsQuery.error || userPostsQuery.error,
        likePost: likePostMutation.mutate,
        addComment: addCommentMutation.mutate,
    };
}