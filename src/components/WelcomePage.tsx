'use client';
import { FormEvent, JSX, SVGProps, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { usePosts } from '@/hooks/usePosts';

type Post = {
    PostPK: string;
    Author: string;
    Title: string;
    Description: string;
    Link: string;
    Likes: number;
    CreatedAt: string;
};

// Define a shared query key
// const POSTS_QUERY_KEY = 'posts';

// const fetchPosts = async (): Promise<Post[]> => {
//     const response = await fetch('api/get-posts');
//     if (!response.ok) {
//         throw new Error('Network response was not ok');
//     }

//     const data = await response.json();
//     return data.items;
// };

export default function WelcomePage() {
    const { user } = useUser();
    const [fullname, setFullname] = useState('');
    const [newProject, setNewProject] = useState({ title: '', description: '', link: '' });
    const [customAmount, setCustomAmount] = useState<string>('');

    const queryClient = useQueryClient();

    const router = useRouter();

    const { posts, isLoading, error, likePost } = usePosts();

    useEffect(() => {
        if (!user || !user.fullName) {
            return;
        }
        setFullname(user.fullName);
    }, [user]);

    // const { data: posts, isLoading, error} = useQuery<Post[]>({
    //     queryKey: [POSTS_QUERY_KEY],
    //     queryFn: fetchPosts,
    //     // refetchInterval: 5000, // 5 seconds
    //     // refetchOnMount: true,
    // });

    const createPostMutation = useMutation({
        mutationFn: (newPost: any) =>
            fetch('/api/save-posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPost),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            setNewProject({ title: '', description: '', link: '' });
        },
    });

    // const likePostMutation = useMutation({
    //     mutationFn: (postId: string) =>
    //         fetch('/api/like-post', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({ postId }),
    //         }),
    //     onMutate: async (postId) => {
    //         // Cancle any outgoing refetches
    //         await queryClient.cancelQueries({ queryKey: [POSTS_QUERY_KEY] });

    //         // Snapshot of the previous value
    //         const previousPosts = queryClient.getQueryData([POSTS_QUERY_KEY]);

    //         // Optimistically update to the new value
    //         queryClient.setQueryData([POSTS_QUERY_KEY], (old: Post[] | undefined) =>
    //             old ? old.map(post => post.PostPK === postId ? {...post, Likes: post.Likes + 1 } : post) : []
    //         );

    //         // Return a context object with the snapshotted value
    //         return { previousPosts };
    //     },
    //     onError: (err, postId, context) => {
    //         queryClient.setQueryData([POSTS_QUERY_KEY], context?.previousPosts);
    //     },
    //     onSuccess: () => {
    //         queryClient.invalidateQueries({ queryKey: [POSTS_QUERY_KEY] });
    //     },
    // });

    const handleInputChange = (e: { target: { name: string; value: string }; }) => {
        const { name, value } = e.target;
        setNewProject((prev) => ({ ...prev, [name]: value }));
    };

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

    // const likePost = async (postId: string) => {
    //     likePostMutation.mutate(postId);
    // };

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
        <div className="flex flex-col min-h-screen">
            <header className="px-4 lg:px-6 h-14 flex items-center border-b">
                <span className="font-semibold text-lg">DevConnect</span>
                <nav className="ml-auto flex gap-4 sm:gap-6">
                    <Button variant="ghost" onClick={() => router.push('/')}>
                        Home
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/my-posts')}
                    >
                        {'My Projects'}
                    </Button>
                    <Button variant="ghost">Notifications</Button>
                </nav>
                <UserButton />
            </header>
            <main className="flex-1 py-6 px-4 md:px-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <h1 className="text-3xl font-bold">
                        Welcome back, {fullname}!
                    </h1>

                    <Tabs defaultValue="create" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="create">
                                Create Project Post
                            </TabsTrigger>
                            <TabsTrigger value="view">
                                View Project Posts
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="create">
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Create a New Project Post
                                    </CardTitle>
                                    <CardDescription>
                                        Share your latest work with the
                                        community
                                    </CardDescription>
                                </CardHeader>
                                <form onSubmit={handleSubmit}>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="project-title">
                                                Project Title
                                            </Label>
                                            <Input
                                                id="project-title"
                                                name="title"
                                                value={newProject.title}
                                                onChange={handleInputChange}
                                                placeholder="Enter your project title"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="project-description">
                                                Project Description
                                            </Label>
                                            <Textarea
                                                id="project-description"
                                                name="description"
                                                value={newProject.description}
                                                onChange={handleInputChange}
                                                placeholder="Describe your project"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="project-link">
                                                Project Link
                                            </Label>
                                            <Input
                                                id="project-link"
                                                name="link"
                                                value={newProject.link}
                                                onChange={handleInputChange}
                                                placeholder="https://your-project-link.com"
                                                required
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit">
                                            Create Project Post
                                        </Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </TabsContent>
                        <TabsContent value="view">
                            <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                                <div className="space-y-8">
                                    {isLoading && (
                                        <div>Loading projects...</div>
                                    )}
                                    {error && (
                                        <div>
                                            An error occurred:{' '}
                                            {(error as Error).message}
                                        </div>
                                    )}
                                    {sortedPosts &&
                                        sortedPosts.map((project) => (
                                            <Card key={project.PostPK}>
                                                <CardHeader>
                                                    <CardTitle>
                                                        {project.Title}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        By {project.Author}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="mb-2">
                                                        {project.Description}
                                                    </p>
                                                    <a
                                                        href={project.Link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:underline"
                                                    >
                                                        View Project
                                                    </a>
                                                </CardContent>
                                                <CardFooter className="flex justify-between">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => window.open(project.Link, '_blank')}
                                                    >
                                                        Visit Site
                                                    </Button>
                                                    <div className="flex items-center space-x-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => likePost(project.PostPK)}
                                                        >
                                                            <HeartIcon className="h-4 w-4" />
                                                        </Button>
                                                        <span>
                                                            {project.Likes} likes
                                                        </span>
                                                    </div>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>

                    <Card>
                        <CardHeader>
                            <CardTitle>Support DevConnect</CardTitle>
                            <CardDescription>
                                Your donation helps us maintain and improve the platform
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4">
                                {[5, 10, 20, 50, 100].map((amount) => (
                                    <Button
                                        key={amount}
                                        variant="outline"
                                        onClick={() => handleDonate(amount)}
                                    >
                                        Donate ${amount}
                                    </Button>
                                ))}
                                <div className="flex items-center space-x-2">
                                    <Input
                                        type="number"
                                        placeholder="Custom amount"
                                        className="w-32"
                                        min="1"
                                        step="1"
                                        value={customAmount}
                                        onChange={(e) =>
                                            setCustomAmount(e.target.value)
                                        }
                                    />
                                    <Button onClick={handleCustomDonate}>
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
        </div>
    );
}

function HeartIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
    );
}
