'use client'
import { FormEvent, JSX, SVGProps, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, UserButton } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Input from '@mui/material/Input';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

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
    Github_Link: string;
    Live_Link: string;
    Likes: number;
    UserLikes: Set<string>;
    CreatedAt: string;
    Comments?: Comment[];
};

export default function MyPostsPage() {
    const { user } = useUser();

    const [newComment, setNewComment] = useState("");
    const [commentingOn, setCommentingOn] = useState<string | null>(null);
    const [commentsModalOpen, setCommentsModalOpen] = useState(false);
    const [commentsToShow, setCommentsToShow] = useState<Comment[]>([]);


    const [fullname, setFullname] = useState("");
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [deletedPosts, setDeletedPosts] = useState<Set<string>>(new Set());

    const [openModal, setOpenModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [editedPost, setEditedPost] = useState<Partial<Post>>({});

    const queryClient = useQueryClient();

    const handleViewComments = (comments: Comment[] | undefined) => {
        if (comments && comments.length > 0) {
            setCommentsToShow(comments);
            setCommentsModalOpen(true);
        }
    };
    

    const fetchUserPosts = async (userId: string): Promise<Post[]> => {
        const response = await fetch(`api/get-user-projects?userId=${userId}`);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        if (!user || !user.id) {
            throw new Error('User not logged in');
        }
        data.items.forEach((post: Post) => {
            if (!post.UserLikes) return;
            const userLikes = Array.from(post.UserLikes);
            if (userLikes.includes(user?.id)) {
                setLikedPosts((prev) => new Set(prev).add(post.PostPK));
            }
        })
        return data.items;
    };

    const deletePost = async (postId: any) => {
        setDeletedPosts(prev => new Set(prev).add(postId));
        try {
            const response = await fetch(`api/delete-post`, {
                method: 'DELETE',
                body: JSON.stringify({ postId: postId }),
            });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
        }
        catch {
            setDeletedPosts(prev => {
                const updated = new Set(prev);
                updated.delete(postId);
                return updated;
            });
        }
        finally {
            queryClient.invalidateQueries({ queryKey: ["userPosts", user?.id] });
        }
    };

    const updatePost = async (postId: string, updatedPost: Partial<Post>) => {
        try {
            console.log('updatedPost', updatedPost);
            const response = await fetch(`api/update-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId, updatedPost }),
            });
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
        }
        catch (error) {
            console.error("Error updating post:", (error as Error).message);
        }
        finally {
            queryClient.invalidateQueries({ queryKey: ["userPosts", user?.id] });
            handleCloseModal();
        }
    };

    useEffect(() => {
        if (!user || !user.fullName) return;
        setFullname(user.fullName);
    }, [user]);

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
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            queryClient.invalidateQueries({ queryKey: ["userPosts", user?.id] });
            setNewComment("");
            setCommentingOn(null);
        },
    });

    const handleCommentSubmit = (postId: string) => {
        if (!user || !newComment.trim()) return;
        addCommentMutation.mutate({
            postId,
            userId: user.id,
            userName: fullname,
            content: newComment.trim(),
        });
    };

    const likePostMutation = useMutation({
        mutationFn: (postId: string) =>
            fetch("/api/like-post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: postId, userId: user?.id }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            queryClient.invalidateQueries({ queryKey: ["userPosts", user?.id] });
        },
    });

    const {
        data: userPosts,
        isLoading: isLoadingUserPosts,
        error: userPostsError,
    } = useQuery<Post[]>({
        queryKey: ["userPosts", user?.id],
        queryFn: () => fetchUserPosts(user?.id || ""),
        enabled: !!user?.id,
    });

    const postsToDisplay = userPosts?.sort((a, b) => b.Likes - a.Likes);
    const isLoading = isLoadingUserPosts;
    const error = userPostsError;

    const likePost = async (postId: string) => {
        if (isCoolingDown) return;
        setIsCoolingDown(true);
        likePostMutation.mutate(postId);
        if (likedPosts.has(postId)) {
            likedPosts.delete(postId);
        } else {
            likedPosts.add(postId);
        }
        setTimeout(() => setIsCoolingDown(false), 1000);
    };

    const router = useRouter();

    const handleOpenModal = (post: Post) => {
        setSelectedPost(post);
        setEditedPost({
            Title: post.Title,
            Description: post.Description,
            Github_Link: post.Github_Link,
            Live_Link: post.Live_Link
        });
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEditedPost(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSaveChanges = () => {
        if (selectedPost) {
            updatePost(selectedPost.PostPK, editedPost);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-4 lg:px-6 h-14 flex items-center border-b">
                <span className="font-semibold text-lg">DevConnect</span>
                <nav className="ml-auto flex gap-4 sm:gap-6">
                    <Button variant="ghost" onClick={() => router.push('/')}>Home</Button>
                    <Button variant="ghost" onClick={() => router.push('/')}>{"All Projects"}</Button>
                    <Button variant="ghost">Notifications</Button>
                </nav>
                <UserButton />
            </header>
            <main className="flex-1 py-6 px-4 md:px-6 min-w-max">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Tabs defaultValue="view" className="w-full">
                        <TabsList className="grid w-full grid-cols-1">
                            <TabsTrigger value="view">My Posts</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <ScrollArea className="overflow-auto w-full whitespace-nowrap h-[600px] w-full rounded-md border p-4">
                        <div className="space-y-8">
                            {isLoading && <div>Loading projects...</div>}
                            {error && <div>An error occurred: {(error as Error).message}</div>}
                            {postsToDisplay && postsToDisplay.map((project) => (
                                <Card key={project.PostPK}>
                                    <CardHeader>
                                        <CardTitle>{project.Title}</CardTitle>
                                        <CardDescription>By {project.Author}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="mb-2">{project.Description}</p>
                                        <a
                                            href={project.Github_Link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                        >
                                            View Project
                                        </a>
                                        {commentingOn === project.PostPK && (
                                            <div className="mt-4">
                                                <Textarea
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Write a comment..."
                                                    className="mb-2"
                                                />
                                                <Button onClick={() => handleCommentSubmit(project.PostPK)}>
                                                    Submit Comment
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardHeader className="absolute top-0 right-0 mt-2 mr-2 flex row">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleOpenModal(project)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => deletePost(project.PostPK)}
                                            disabled={deletedPosts.has(project.PostPK)}
                                        >
                                            {deletedPosts.has(project.PostPK) ? 'Deleting...' : 'Delete'}
                                        </Button>
                                    </CardHeader>
                                    <CardFooter className="flex justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => window.open(project.Live_Link, "_blank")}
                                            >
                                                Visit Site
                                            </Button>
                                            {project.Comments && project.Comments.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleViewComments(project.Comments)}
                                                >
                                                    View Comments ({project.Comments.length})
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => likePost(project.PostPK)}
                                            >
                                                {likedPosts.has(project.PostPK) ? <HeartIcon color="red" /> : <HeartIcon color="none" />}
                                            </Button>
                                            <span>{project.Likes} likes</span>
                                            <Button
                                                variant="ghost"
                                                onClick={() =>
                                                    setCommentingOn(
                                                        commentingOn === project.PostPK ? null : project.PostPK
                                                    )
                                                }
                                            >
                                                {commentingOn === project.PostPK ? "Cancel" : "Comment"}
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </main>
            <footer className="border-t py-4 px-4 md:px-6">
                <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
                    © 2023 DevConnect. All rights reserved.
                </div>
            </footer>
            <Dialog open={commentsModalOpen} onClose={() => setCommentsModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ backgroundColor: '#f5f5f5', padding: '16px 24px', fontWeight: 'bold' }}>
                    Comments
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={() => setCommentsModalOpen(false)}
                        aria-label="close"
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ padding: '24px' }}>
                    {commentsToShow.length > 0 ? (
                        <div>
                            {commentsToShow.map((comment) => (
                                <div key={comment.CommentId} className="bg-gray-100 p-2 rounded mb-2">
                                    <p className="text-sm font-semibold">{comment.UserName}</p>
                                    <p className="text-sm">{comment.Content}</p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(comment.CreatedAt).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p>No comments available.</p>
                    )}
                </DialogContent>
                <DialogActions sx={{ padding: '16px 24px', backgroundColor: '#f5f5f5' }}>
                    <Button onClick={() => setCommentsModalOpen(false)} variant="outline">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

interface HeartIconProps extends SVGProps<SVGSVGElement> {
    color?: string;
}

function HeartIcon({ color = 'red', ...props }: HeartIconProps) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={color}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
    );
}
