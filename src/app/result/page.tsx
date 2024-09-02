'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutSession {
    id: string;
    amount_total: number;
    currency: string;
    payment_status: string;
  }

export default function ResultPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const session_id = searchParams.get('session_id');

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<CheckoutSession | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCheckoutSession = async () => {
            if (!session_id) {
                setError("No session ID provided");
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/checkout-session?session_id=${session_id}`);
                const sessionData = await res.json();

                if (res.ok) {
                    setSession(sessionData);
                } else {
                    setError(sessionData.error.message || 'An error occured');
                }

            } catch (error) {
                setError('An error occured');
            } finally {
                setLoading(false);
            }
        };
        fetchCheckoutSession();
    }, [session_id]);

    if (loading) {
        return (
            <Card className="w-[350px] mx-auto mt-10">
                <CardContent className="flex items-center justify-center h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-[350px] mx-auto mt-10">
                <CardHeader>
                    <CardTitle className="text-red-500">Error</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/')} className="w-full">
                        Return to Home
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!session) {
        return (
            <Card className="w-[350px] mx-auto mt-10">
                <CardHeader>
                    <CardTitle>Session Not Found</CardTitle>
                    <CardDescription>We couldn`&apos`t find the donation session.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={() => router.push('/')} className="w-full">
                        Return to Home
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (session.payment_status !== 'paid') {
        return (
            <Card className="w-[350px] mx-auto mt-10">
                <CardHeader>
                    <CardTitle>Donation Not Completed</CardTitle>
                    <CardDescription>Your donation process was not completed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <p>Amount: {(session.amount_total / 100).toFixed(2)} {session.currency.toUpperCase()}</p>
                        <p>Status: {session.payment_status}</p>
                        <p>You can try donating again from our home page.</p>
                    </div>
                    <Button onClick={() => router.push('/')} className="w-full mt-4">
                        Return to Home
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-[350px] mx-auto mt-10">
            <CardHeader>
                <CardTitle>Thank You for Your Donation!</CardTitle>
                <CardDescription>Your support means a lot to us.</CardDescription>
            </CardHeader>
            <CardContent>
                {session && (
                    <div className="space-y-2">
                        <p>Amount: {(session.amount_total / 100).toFixed(2)} {session.currency.toUpperCase()}</p>
                        <p>Status: {session.payment_status}</p>
                        <div>
                            <p className="font-semibold">Transaction ID:</p>
                            <p className="break-all text-sm">{session.id}</p>
                        </div>
                    </div>
                )}
                <Button onClick={() => router.push('/')} className="w-full mt-4">
                    Return to Home
                </Button>
            </CardContent>
        </Card>
    );
}