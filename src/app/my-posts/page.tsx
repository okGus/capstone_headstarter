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
    Flair: string;
    UserId: string;
    Skills: string[];
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
            }).then(res => {
                if (!res.ok) throw new Error('Failed to like post');
                return res.json();
            }),
        onSuccess: (data: {message: string, action: 'like' | 'unlike' }, variables: string) => {
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            queryClient.invalidateQueries({ queryKey: ["userPosts", user?.id] });

            setLikedPosts(prev => {
                const newSet = new Set(prev);
                console.log('Variables in LikePostMutation',variables);
                if (data.action === 'like') {
                    newSet.add(variables); // variables is the postId
                } else {
                    newSet.delete(variables);
                }

                return newSet;
            });
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
        // if (likedPosts.has(postId)) {
        //     likedPosts.delete(postId);
        // } else {
        //     likedPosts.add(postId);
        // }
        setTimeout(() => setIsCoolingDown(false), 1000);
    };

    const router = useRouter();

    const handleOpenModal = (post: Post) => {
        setSelectedPost(post);
        setEditedPost({
            Title: post.Title,
            Description: post.Description,
            Github_Link: post.Github_Link,
            Live_Link: post.Live_Link,
            Flair: post.Flair,
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
        <div className="flex flex-col min-h-screen bg-gray-900 text-white">
            <header className="px-4 lg:px-6 h-14 flex items-center border-b border-gray-700">
                <span className="font-semibold text-lg text-purple-300">DevConnect</span>
                <nav className="ml-auto flex gap-4 sm:gap-6">
                    <Button variant="ghost" onClick={() => router.push('/')} className="text-purple-300 hover:text-purple-100 hover:bg-purple-900">Home</Button>
                    <Button variant="ghost" onClick={() => router.push('/')} className="text-purple-300 hover:text-purple-100 hover:bg-purple-900">All Projects</Button>
                    <Button variant="ghost" className="text-purple-300 hover:text-purple-100 hover:bg-purple-900">Notifications</Button>
                </nav>
                <UserButton />
            </header>
            <main className="flex-1 py-6 px-4 md:px-6 min-w-max">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Tabs defaultValue="view" className="w-full">
                        <TabsList className="grid w-full grid-cols-1 bg-gray-800">
                            <TabsTrigger value="view" className="text-purple-300 data-[state=active]:bg-purple-900 data-[state=active]:text-white">My Posts</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <ScrollArea className="overflow-auto w-full whitespace-nowrap h-[600px] w-full rounded-md border border-gray-700 p-4 bg-gray-800">
                        <div className="space-y-8">
                            {isLoading && <div className="text-purple-300">Loading projects...</div>}
                            {error && <div className="text-red-500">An error occurred: {(error as Error).message}</div>}
                            {postsToDisplay && postsToDisplay.map((project) => (
                                <Card key={project.PostPK} className="relative p-4 bg-gray-800 border-purple-700">
                                    <div className="flex flex-col items-end space-y-2 absolute top-2 right-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => handleOpenModal(project)}
                                            className="w-20 bg-purple-700 text-white hover:bg-purple-600"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => deletePost(project.PostPK)}
                                            disabled={deletedPosts.has(project.PostPK)}
                                            className="w-20 bg-red-700 text-white hover:bg-red-600"
                                        >
                                            {deletedPosts.has(project.PostPK) ? 'Deleting...' : 'Delete'}
                                        </Button>
                                    </div>
                                    <CardHeader>
                                        <CardTitle className="text-purple-300">{project.Title}</CardTitle>
                                        <CardDescription className="text-gray-400">
                                            By {project.Author} <span className="mx-1">•</span>
                                            <span className={`px-2 py-1 rounded-md ${project.Flair === 'DevShow' ? 'bg-blue-600 text-white' : project.Flair === 'DevHelp' ? 'bg-green-600 text-white' : ''}`}>
                                                {project.Flair}
                                            </span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="mb-2 text-gray-300">{project.Description}</p>
                                        <a
                                            href={project.Github_Link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-purple-400 hover:text-purple-300 hover:underline"
                                        >
                                            View Project
                                        </a>
                                        {project.Skills && project.Skills.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {project.Skills.map((skill, index) => (
                                                                <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 rounded-md">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                        {commentingOn === project.PostPK && (
                                            <div className="mt-4">
                                                <Textarea
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    placeholder="Write a comment..."
                                                    className="mb-2 bg-gray-700 text-white border-purple-500 focus:ring-purple-400"
                                                />
                                                <Button onClick={() => handleCommentSubmit(project.PostPK)} className="bg-purple-700 text-white hover:bg-purple-600">
                                                    Submit Comment
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                    <CardFooter className="flex justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => window.open(project.Live_Link, "_blank")}
                                                className="border-purple-500 text-purple-500 hover:bg-purple-700 hover:text-white font-bold"
                                            >
                                                Visit Site
                                            </Button>
                                            {project.Comments && project.Comments.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleViewComments(project.Comments)}
                                                    className="border-purple-500 text-purple-500 hover:bg-purple-700 hover:text-white font-bold"
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
                                                className="text-purple-300 hover:text-purple-100"
                                            >
                                                {likedPosts.has(project.PostPK) ? <HeartIcon color="red" /> : <HeartIcon color="none" />}
                                            </Button>
                                            <span className="text-gray-300">{project.Likes} likes</span>
                                            <Button
                                                variant="ghost"
                                                onClick={() =>
                                                    setCommentingOn(
                                                        commentingOn === project.PostPK ? null : project.PostPK
                                                    )
                                                }
                                                className="text-purple-300 hover:text-purple-100 hover:bg-purple-900"
                                            >
                                                {commentingOn === project.PostPK ? "Cancel" : "Comment"}
                                            </Button>
                                        </div>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                    <Dialog 
                        open={openModal} 
                        onClose={handleCloseModal} 
                        maxWidth="sm" 
                        fullWidth
                        PaperProps={{
                            style: {
                                backgroundColor: '#1F2937', // dark background
                                color: '#E5E7EB', // light text
                            },
                        }}
                    >
                        <DialogTitle sx={{ 
                            backgroundColor: '#111827', 
                            color: '#E5E7EB',
                            padding: '16px 24px', 
                            fontWeight: 'bold',
                            borderBottom: '1px solid #374151'
                        }}>
                            Edit Post
                            <IconButton
                                edge="end"
                                color="inherit"
                                onClick={handleCloseModal}
                                aria-label="close"
                                sx={{ 
                                    position: 'absolute', 
                                    right: 8, 
                                    top: 8,
                                    color: '#9CA3AF'
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ padding: '24px', backgroundColor: '#1F2937' }}>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        name="Title"
                                        value={editedPost.Title || ''}
                                        onChange={handleInputChange}
                                        placeholder="Project Title"
                                        required
                                        fullWidth
                                        sx={{ 
                                            padding: '10px', 
                                            backgroundColor: '#374151', 
                                            borderRadius: '4px',
                                            color: '#E5E7EB',
                                            '&:hover': {
                                                backgroundColor: '#4B5563'
                                            },
                                            '&:focus': {
                                                backgroundColor: '#4B5563',
                                                boxShadow: '0 0 0 2px #8B5CF6'
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Textarea
                                        name="Description"
                                        value={editedPost.Description || ''}
                                        onChange={handleInputChange}
                                        placeholder="Project Description"
                                        required
                                        className="bg-gray-700 text-white border-purple-500 focus:ring-purple-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        name="Github_Link"
                                        value={editedPost.Github_Link || ''}
                                        onChange={handleInputChange}
                                        placeholder="Github Link"
                                        required
                                        fullWidth
                                        sx={{ 
                                            padding: '10px', 
                                            backgroundColor: '#374151', 
                                            borderRadius: '4px',
                                            color: '#E5E7EB',
                                            '&:hover': {
                                                backgroundColor: '#4B5563'
                                            },
                                            '&:focus': {
                                                backgroundColor: '#4B5563',
                                                boxShadow: '0 0 0 2px #8B5CF6'
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        name="Live_Link"
                                        value={editedPost.Live_Link || ''}
                                        onChange={handleInputChange}
                                        placeholder="Live Link"
                                        required
                                        fullWidth
                                        sx={{ 
                                            padding: '10px', 
                                            backgroundColor: '#374151', 
                                            borderRadius: '4px',
                                            color: '#E5E7EB',
                                            '&:hover': {
                                                backgroundColor: '#4B5563'
                                            },
                                            '&:focus': {
                                                backgroundColor: '#4B5563',
                                                boxShadow: '0 0 0 2px #8B5CF6'
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </DialogContent>
                        <DialogActions sx={{ padding: '16px 24px', backgroundColor: '#111827' }}>
                            <Button onClick={handleCloseModal} variant="outline" className="bg-gray-700 text-white hover:bg-gray-600">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveChanges} variant="outline" className="bg-purple-700 text-white hover:bg-purple-600">
                                Save
                            </Button>
                        </DialogActions>
                    </Dialog>
                    <Dialog
                open={commentsModalOpen}
                onClose={() => setCommentsModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    style: {
                        backgroundColor: '#1F2937', // Dark background for the dialog
                        color: '#E5E7EB', // Light text color
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        backgroundColor: '#111827', // Darker header background
                        color: '#E5E7EB', // Light text color
                        padding: '16px 24px',
                        fontWeight: 'bold',
                        borderBottom: '1px solid #6D28D9', // Purple border
                        position: 'relative', // For absolute positioning of the close button
                    }}
                >
                    Comments
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={() => setCommentsModalOpen(false)}
                        aria-label="close"
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: '#D4A5A5', // Light pink color for the icon
                            '&:hover': {
                                backgroundColor: '#6D28D9', // Purple background on hover
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent
                    dividers
                    sx={{
                        padding: '24px',
                        backgroundColor: '#1F2937', // Dark background for content
                        color: '#E5E7EB', // Light text color
                    }}
                >
                    {commentsToShow.length > 0 ? (
                        <div>
                            {commentsToShow.map((comment) => (
                                <div key={comment.CommentId} className="bg-gray-800 p-2 rounded mb-2">
                                    <p className="text-sm font-semibold text-purple-300">{comment.UserName}</p>
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
                <DialogActions
                    sx={{
                        padding: '16px 24px',
                        backgroundColor: '#111827', // Matching the dialog header background
                        color: '#E5E7EB', // Light text color
                    }}
                >
                    <Button
                        onClick={() => setCommentsModalOpen(false)}
                        className="bg-purple-600 text-gray-100 hover:bg-purple-700"
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
                </div>
            </main>
            <footer className="border-t border-gray-700 py-4 px-4 md:px-6">
                <div className="max-w-4xl mx-auto text-center text-sm text-gray-400">
                    © 2023 DevConnect. All rights reserved.
                </div>
            </footer>
            {/* Keep Dialog components as they are, or update their styling if needed */}
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
