'use client';
import { FormEvent, JSX, SVGProps, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserButton, useUser } from '@clerk/nextjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import getStripe from '@/lib/get-stripejs';
import { useRouter } from 'next/navigation';
import Notifications from './Notifications';

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
    Skills: string[];
    UserId: string;
};

export default function WelcomePage() {
    const { user } = useUser();

    const [newComment, setNewComment] = useState("");
    const [commentingOn, setCommentingOn] = useState<string | null>(null);
    const [commentsModalOpen, setCommentsModalOpen] = useState(false);
    const [commentsToShow, setCommentsToShow] = useState<Comment[]>([]);

    const [fullname, setFullname] = useState('');
    const [newProject, setNewProject] = useState({ title: '', description: '', flair: 'DevShow', github_link: '', live_link: '', skills: [] as string[] });
    const [customAmount, setCustomAmount] = useState<string>('');

    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

    const queryClient = useQueryClient();

    const [skillInput, setSkillInput] = useState('');

    const router = useRouter();

    // const handleSkillChange = (e: any, index: any) => {
    //     const updatedSkills = [...newProject.skills];
    //     updatedSkills[index] = e.target.value;
    //     setNewProject({ ...newProject, skills: updatedSkills });
    // };
    
    const addSkill = () => {
        const trimmedSkillInput = skillInput.trim(); // Trim whitespace from the input
    
        if (trimmedSkillInput && newProject.skills.length < 5) {
            setNewProject(prevState => ({
                ...prevState,
                skills: [...prevState.skills, trimmedSkillInput],
            }));
            setSkillInput(''); // Clear the input field after adding the skill
        }
    };
    
    
    const removeSkill = (index: any) => {
        const updatedSkills = newProject.skills.filter((_, i) => i !== index);
        setNewProject({ ...newProject, skills: updatedSkills });
    };

    const handleViewComments = (comments: Comment[] | undefined) => {
        if (comments && comments.length > 0) {
            setCommentsToShow(comments);
            setCommentsModalOpen(true);
        }
    };

    const fetchPosts = async (): Promise<Post[]> => {
        const response = await fetch('api/get-posts');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    
        const data = await response.json();

        if (!user || !user.id) {
            throw new Error('User not logged in');
        }
    
        //Add data posts that have this user's ID in UserLikes to likedPosts
        data.items.forEach((post: Post) => {
            if (!post.UserLikes) {
                return data.items;
            }
            const userLikes = Array.from(post.UserLikes);
            if (userLikes.includes(user?.id)) {
                setLikedPosts((prev) => new Set(prev).add(post.PostPK));
            }
        })

        return data.items;
    };

    useEffect(() => {
        if (!user || !user.fullName) {
            return;
        }
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
    

    const createPostMutation = useMutation({
        mutationFn: (newPost: any) =>
            fetch('/api/save-posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPost),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            setNewProject({ title: '', description: '', flair: 'DevShow', github_link: '', live_link: '', skills: [] });
        },
    });

    const likePostMutation = useMutation({
        mutationFn:(postId: string) =>
            fetch('/api/like-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: postId, userId: user?.id, userName: user?.fullName }),
            }).then(res => {
                if (!res.ok) throw new Error('Failed to like post');
                return res.json();
            }),
        onSuccess: (data: {message: string, action: 'like' | 'unlike' }, variables: string) => {
            queryClient.invalidateQueries({ queryKey: ['posts']});

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

    const { data: posts, isLoading: isLoading, error: error} = useQuery<Post[]>({
        queryKey: ['posts'],
        queryFn: fetchPosts,
        enabled: !!user?.id,
        
        // refetchInterval: 5000, // 5 seconds
    });

    const handleInputChange = (e: { target: { name: string; value: string }; }) => {
        const { name, value } = e.target;
        setNewProject((prev) => ({ ...prev, [name]: value }));
    };

    const handleKeyDown = (e: any) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkill();
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!user) {
            console.error('User not logged in');
            return;
        }

        // Create project post
        const newProjectPost = {
            userID: user.id,
            ...newProject,
            author: fullname,
            likes: 0,
        };

        createPostMutation.mutate(newProjectPost);
    };

    const likePost = async (postId: string) => {
        if (isCoolingDown) return;
        setIsCoolingDown(true);
        likePostMutation.mutate(postId);

        // If the post is already liked then remove from setLikedPosts else add it
        // if (likedPosts.has(postId)) {
        //     likedPosts.delete(postId);
        // } else {
        //     likedPosts.add(postId);
        // }

        setTimeout(() => setIsCoolingDown(false), 1000);
    };

    const handleDonate = async (amount: number) => {
        console.log(`Initiating donation of $${amount}`);

        const response = await fetch('/api/checkout-session', {
            method: 'POST',
            headers: {
                'content-Type': 'application/json',
            },
            body: JSON.stringify({ amount }),
        });

        const checkoutSession = await response.json();
        if (!response.ok) {
            throw new Error(
                checkoutSession.message || 'An error occured during checkout'
            );
        }

        const stripe = await getStripe();
        if (!stripe) {
            throw new Error('Failed to load Stripe');
        }

        const result = await stripe?.redirectToCheckout({
            sessionId: checkoutSession.sessionId,
        });

        if (result.error) {
            throw new Error(result.error.message);
        }
    };

    const handleCustomDonate = () => {
        const amount = parseFloat(customAmount);
        if (!isNaN(amount) && amount > 0) {
            handleDonate(amount);
        } else {
            console.error('Invalid amount');
        }
    };

    const sortedPosts = posts?.sort((a, b) => b.Likes - a.Likes);

    return (
        <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
            <header className="px-4 lg:px-6 h-14 flex items-center border-b border-gray-700 bg-gray-800">
                <span className="font-semibold text-lg text-purple-400">DevConnect</span>
                <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/')}
                        className="text-gray-300 hover:bg-purple-700 hover:text-white"
                    >
                        Home
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/my-posts')}
                        className="text-gray-300 hover:bg-purple-700 hover:text-white"
                    >
                        My Projects
                    </Button>
                    {user && (
                        <Button className="focus:outline-none text-gray-300 hover:bg-purple-700 hover:text-white">
                            <Notifications userId={user.id} />
                        </Button>
                    )}
                    <UserButton />
                </nav>
            </header>
            <main className="flex-1 py-6 px-4 md:px-6 bg-gray-900">
                <div className="max-w-4xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold bg-gray-800 p-4 rounded-lg">
                    Welcome back, {fullname}!
                </h1>

                    <Tabs defaultValue="create" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                            <TabsTrigger value="create" className="text-gray-300 data-[state=active]:bg-purple-700 data-[state=active]:text-white">
                                Create Project Post
                            </TabsTrigger>
                            <TabsTrigger value="view" className="text-gray-300 data-[state=active]:bg-purple-700 data-[state=active]:text-white">
                                View Project Posts
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="create">
                            <Card className="bg-gray-800 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-purple-300">
                                        Create a New Project Post
                                    </CardTitle>
                                    <CardDescription className="text-gray-400">
                                        Share your latest work with the
                                        community
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleSubmit}>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="project-title" className="text-gray-300">
                                            Project Title
                                        </Label>
                                        <Input
                                            id="project-title"
                                            name="title"
                                            value={newProject.title}
                                            onChange={handleInputChange}
                                            placeholder="Enter your project title"
                                            required
                                            className="bg-gray-700 text-gray-300 border-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-description" className="text-gray-300">
                                            Project Description
                                        </Label>
                                        <Textarea
                                            id="project-description"
                                            name="description"
                                            value={newProject.description}
                                            onChange={handleInputChange}
                                            placeholder="Describe your project"
                                            required
                                            className="bg-gray-700 text-gray-300 border-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-flairs" className="text-gray-300">Project Flairs</Label>
                                        <div className="flex space-x-2">
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    className={`px-4 py-2 border rounded-md ${newProject.flair === 'DevShow' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                                                    onClick={() => setNewProject({ ...newProject, flair: 'DevShow' })}
                                                >
                                                    DevShow
                                                </button>
                                                <div className="absolute left-0 top-full mt-1 w-32 p-2 bg-gray-800 text-gray-300 text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    Show off your development project!
                                                </div>
                                            </div>
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    className={`px-4 py-2 border rounded-md ${newProject.flair === 'DevHelp' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                                                    onClick={() => setNewProject({ ...newProject, flair: 'DevHelp' })}
                                                >
                                                    DevHelp
                                                </button>
                                                <div className="absolute left-0 top-full mt-1 w-32 p-2 bg-gray-800 text-gray-300 text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    Ask for help on your development project.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-link" className="text-gray-300">
                                            Project Github Link
                                        </Label>
                                        <Input
                                            id="project-link"
                                            name="github_link"
                                            value={newProject.github_link}
                                            onChange={handleInputChange}
                                            placeholder="https://your-project-link.com"
                                            required
                                            className="bg-gray-700 text-gray-300 border-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-link" className="text-gray-300">
                                            Project Live Link (Optional)
                                        </Label>
                                        <Input
                                            id="project-link"
                                            name="live_link"
                                            value={newProject.live_link}
                                            onChange={handleInputChange}
                                            placeholder="https://your-project-link.com"
                                            className="bg-gray-700 text-gray-300 border-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="project-skills" className="text-gray-300">Project Skills</Label>
                                        <div className="space-y-2">
                                            <Input
                                                id="project-skills"
                                                name="skillInput"
                                                value={skillInput}
                                                onChange={(e) => setSkillInput(e.target.value)}
                                                placeholder="Add a skill"
                                                maxLength={50}
                                                className="w-full bg-gray-700 text-gray-300 border-gray-600"
                                                onKeyDown={handleKeyDown}
                                            />
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {newProject.skills.map((skill, index) => (
                                                    <div key={index} className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-full">
                                                        <span>{skill}</span>
                                                        <button
                                                            type="button"
                                                            className="text-red-300"
                                                            onClick={() => removeSkill(index)}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            {newProject.skills.length < 5 && (
                                                <button
                                                    type="button"
                                                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                                                    onClick={addSkill}
                                                >
                                                    Add Skill
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                                            Create Project Post
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>
                        <TabsContent value="view">
                            <div className="overflow-auto display-block overflow-scroll w-full">
                            <ScrollArea className="overflow-auto w-full h-[600px] rounded-md border border-gray-700 p-4 bg-gray-800">
                                <div className="space-y-8 w-full">
                                    {isLoading && (
                                        <div className="text-gray-300">Loading projects...</div>
                                    )}
                                    {error && (
                                        <div className="text-red-400">
                                            An error occurred:{' '}
                                            {(error as Error).message}
                                        </div>
                                    )}
                                    {sortedPosts &&
                                        sortedPosts.map((project) => (
                                            <Card key={project.PostPK} className="bg-gray-800 border-gray-700">
                                                <CardHeader>
                                                    <CardTitle className="text-purple-300">
                                                        {project.Title}
                                                    </CardTitle>
                                                    <CardDescription className="text-gray-400">
                                                        By {project.Author} <span className="mx-1">•</span>
                                                        <span className={`px-2 py-1 rounded-md ${project.Flair === 'DevShow' ? 'bg-blue-600 text-white' : project.Flair === 'DevHelp' ? 'bg-green-600 text-white' : ''}`}>
                                                            {project.Flair}
                                                        </span>
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="text-gray-300">
                                                    <p className="mb-2">
                                                        {project.Description}
                                                    </p>
                                                    <a
                                                        href={project.Github_Link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-purple-400 hover:underline"
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
                                                                className="mb-2 bg-gray-700 text-gray-300 border-gray-600"
                                                            />
                                                            <Button onClick={() => handleCommentSubmit(project.PostPK)} className="bg-purple-600 hover:bg-purple-700 text-white">
                                                                Submit Comment
                                                            </Button>
                                                        </div>
                                                    )}
                                                </CardContent>
                                                <CardFooter className="flex justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        {project.Live_Link && <Button
                                                            variant="outline"
                                                            onClick={() => window.open(project.Live_Link, "_blank")}
                                                            className="border-purple-500 text-purple-500 hover:bg-purple-700 hover:text-white font-bold"
                                                        >
                                                            Visit Site
                                                        </Button>}
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
                                                            className="text-gray-300 hover:bg-purple-700 hover:text-white"
                                                        >
                                                            {likedPosts.has(project.PostPK) ? <HeartIcon className="h-4 w-4" color='red' /> : <HeartIcon className="h-4 w-4" color='none' />}
                                                        </Button>
                                                        <span className="text-gray-300">
                                                            {project.Likes} likes
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() =>
                                                                setCommentingOn(
                                                                    commentingOn === project.PostPK ? null : project.PostPK
                                                                )
                                                            }
                                                            className="text-gray-300 hover:bg-purple-700 hover:text-white"
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
                        </TabsContent>
                    </Tabs>

                    <Card className="bg-gray-800 text-white shadow-lg border-black">
                        <CardHeader className="border-b border-purple-700">
                            <CardTitle className="text-2xl font-bold text-purple-300">Support DevConnect</CardTitle>
                            <CardDescription className="text-gray-300">
                            Your donation helps us maintain and improve the platform
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-4">
                            {[5, 10, 20, 50, 100].map((amount) => (
                                <Button
                                key={amount}
                                variant="outline"
                                onClick={() => handleDonate(amount)}
                                className="bg-purple-700 text-white border-purple-500 hover:bg-purple-600"
                                >
                                Donate ${amount}
                                </Button>
                            ))}
                            <div className="flex items-center space-x-2">
                                <Input
                                type="number"
                                placeholder="Custom amount"
                                className="w-32 bg-gray-700 text-white border-purple-500 focus:ring-purple-400"
                                min="1"
                                step="1"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                />
                                <Button 
                                onClick={handleCustomDonate}
                                className="bg-purple-700 text-white hover:bg-purple-600"
                                >
                                Donate
                                </Button>
                            </div>
                            </div>
                        </CardContent>
                        </Card>
                </div>
            </main>
            <footer className="border-t py-4 px-4 md:px-6">
                <div className="max-w-4xl mx-auto text-center text-sm text-gray-500">
                    © 2023 DevConnect. All rights reserved.
                </div>
            </footer>
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
    );
}

interface HeartIconFilledProps extends SVGProps<SVGSVGElement> {
    color?: string; // Add a color prop
}

function HeartIcon({ color = 'red', ...props }: HeartIconFilledProps) {
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
