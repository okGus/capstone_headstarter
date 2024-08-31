'use client'
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser, UserButton } from "@clerk/nextjs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormEvent, JSX, SVGProps, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";


type Post = {
    PostPK: string;
    Author: string;
    Title: string;
    Description: string;
    Link: string;
    Likes: number;
    CreatedAt: string; // Assuming it's an ISO date string
};

const fetchUserPosts = async (userId: string): Promise<Post[]> => {
    const response = await fetch(`api/get-user-projects?userId=${userId}`);
    if (!response.ok) {
        throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data.items;
};

export default function MyPostsPage() {
    const { user } = useUser();

    const queryClient = useQueryClient();

    const likePostMutation = useMutation({
        mutationFn: (postId: string) =>
            fetch("/api/like-post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["posts"] });
            // queryClient.invalidateQueries({ queryKey: ["userPosts", user?.id] });
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

    const postsToDisplay = userPosts;
    const isLoading = isLoadingUserPosts;
    const error = userPostsError;

    const likePost = async (postId: string) => {
        likePostMutation.mutate(postId);
    };

    const router = useRouter();

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-4 lg:px-6 h-14 flex items-center border-b">
                <span className="font-semibold text-lg">DevConnect</span>
                <nav className="ml-auto flex gap-4 sm:gap-6">
                <Button variant="ghost" onClick={() => router.push('/')}>
                    Home
                </Button>
                <Button variant="ghost" onClick={() => router.push('/')}>
                    {"All Projects"}
                </Button>
                <Button variant="ghost">Notifications</Button>
                </nav>
                <UserButton />
            </header>
            <main className="flex-1 py-6 px-4 md:px-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    <Tabs defaultValue="view" className="w-full">
                        <TabsList className="grid w-full grid-cols-1">
                            <TabsTrigger value="view">My Posts</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                        <div className="space-y-8">
                            {isLoading && <div>Loading projects...</div>}
                            {error && (
                                <div>An error occurred: {(error as Error).message}</div>
                            )}
                            {postsToDisplay &&
                                postsToDisplay.map((project) => (
                                    <Card key={project.PostPK}>
                                        <CardHeader>
                                            <CardTitle>{project.Title}</CardTitle>
                                            <CardDescription>By {project.Author}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="mb-2">{project.Description}</p>
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
                                                onClick={() => window.open(project.Link, "_blank")}
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
                                                <span>{project.Likes} likes</span>
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
