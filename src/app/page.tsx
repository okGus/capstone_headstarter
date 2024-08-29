import LandingPage from "@/components/LandingPage";
import WelcomePage from "@/components/WelcomePage";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <WelcomePage />
      </SignedIn>
    </>
  );
}