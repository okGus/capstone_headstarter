import { NextRequest, NextResponse } from "next/server";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const CURRENCY = 'usd'; // Set your default currency

const formatAmountForStripe = (amount: number): number => {
    return Math.round(amount * 100);
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const session_id = searchParams.get('session_id');

    if (!session_id) {
        return NextResponse.json({ error: { message: 'Missing sessin_id paramter'} }, { status: 400 });
    }
    console.log(session_id);

    try {
        const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
        return NextResponse.json(checkoutSession);
    } catch (err) {
        console.error('Error retrieving checkout session:', err);
        if (err instanceof Stripe.errors.StripeError) {
            return NextResponse.json({ error: {message: err.message } }, { status: err.statusCode || 500 }); 
        } else {
            return NextResponse.json({ error: {message: 'An unexpected error occured' } }, { status: 500 });
        }
    }
}

export async function POST(req: Request) {
    try {
        const { amount } = await req.json();

        if (!amount) {
            return NextResponse.json({ error: 'Amount are required' }, { status: 400 });
        }

        const params: Stripe.Checkout.SessionCreateParams = {
            submit_type: 'donate',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: CURRENCY,
                        product_data: {
                            name: 'Support DevConnect',
                            description: 'Donation helps us maintain and improve the platform'
                        },
                        unit_amount: formatAmountForStripe(amount),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.get('origin')}/result?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/result?session_id={CHECKOUT_SESSION_ID}`,
        };

        const checkoutSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create(params);

        return NextResponse.json({ sessionId: checkoutSession.id });
    } catch (err) {
        console.error('Error creating checkout session:', err);
        return NextResponse.json({ error: 'Error creating checkout session' }, { status: 500 });
    }
}