"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactPlayer from "react-player";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { FormEvent, JSX, SVGProps, useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";

export default function LandingPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const { scrollYProgress } = useScroll();
  const yRange = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const pathLength = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 90,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = () => {
    const sections = document.querySelectorAll("section");

    // Detect if the user is on Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const targetElement = entry.target as HTMLElement;
            const index = Array.from(sections).indexOf(targetElement);
            setCurrentSection(index);
          }
        });
      },
      {
        root: null,
        rootMargin: isSafari ? "0% 0px -30% 0px" : "0px 0px -30% 0px", // Increased window size
        threshold: isSafari ? 0.05 : [0, 0.2, 0.6, 1.0], // Slightly adjusted thresholds for larger range
      }      
      
    );

    sections.forEach((section) => {
      observer.observe(section);
    });
  };

  const targetSectionRef = useRef<HTMLDivElement>(null);

  const scrollToSectionLearnMore = () => {
      if (targetSectionRef.current) {
          targetSectionRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      const offset = 50; // Adjust this value if needed
      const targetPosition =
        section.getBoundingClientRect().top + window.pageYOffset - offset;
      const startPosition = window.pageYOffset;
      const distance = targetPosition - startPosition;
      const duration = 1000; // Duration in milliseconds
      let startTime: number | null = null;

      const scrollAnimation = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(
          timeElapsed,
          startPosition,
          distance,
          duration
        );
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(scrollAnimation);
      };

      const easeInOutQuad = (t: number, b: number, c: number, d: number) => {
        t /= d / 2;
        if (t < 1) return (c / 2) * t * t + b;
        t--;
        return (-c / 2) * (t * (t - 2) - 1) + b;
      };

      requestAnimationFrame(scrollAnimation);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSubmitWaitlist = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      setMessage(data.message || "Something went wrong.");
    } catch (error) {
      setMessage("Something went wrong.");
    }

    // Clear fields
    setName("");
    setEmail("");
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      y: -50,
      transition: { duration: 0.8, ease: "easeIn" },
    },
  };

  const loadingVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
  };

  const LoadingScreen = () => (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black z-50"
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={loadingVariants}
    >
      <motion.svg
        className="w-32 h-32" // Larger fixed size
        viewBox="0 0 120 120" // Ensure the viewBox covers the full SVG size
        preserveAspectRatio="xMidYMid meet"
      >
        <motion.path
          d="M10,60 a50,50 0 1,0 100,0 a50,50 0 1,0 -100,0" // Adjusted to fit within the viewBox
          fill="none"
          stroke="#3b82f6"
          strokeWidth="8"
          strokeDasharray="390"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1.2 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </motion.svg>
      <motion.div
        className="ml-4 text-2xl font-bold text-white"
        variants={loadingVariants}
      >
        {"DevConnect".split("").map((letter, index) => (
          <motion.span key={index} variants={letterVariants}>
            {letter}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {loading ? (
        <LoadingScreen key="loading" />
      ) : (
        <motion.div
          className="flex flex-col min-h-screen relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          key="main"
        >
          <svg
            className="fixed top-0 left-0 w-full h-2"
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M0,1 L100,1"
              stroke="#3b82f6"
              strokeWidth="4"
              style={{
                pathLength,
                vectorEffect: "non-scaling-stroke",
              }}
            />
          </svg>

          <header className="px-4 lg:px-6 h-14 flex items-center fixed w-full bg-black bg-opacity-90 backdrop-filter backdrop-blur-lg z-40">
            <Link className="flex items-center justify-center" href="#">
              <MountainIcon className="h-6 w-6 text-purple-900" />
              <span className="text-xl font-bold text-purple-500 ml-2">
                DevConnect
              </span>
              <span className="sr-only">Project Showcase</span>
            </Link>
            <nav className="ml-auto flex gap-2 sm:gap-1">
              <Button
                variant="ghost"
                onClick={() => scrollToSection("featured-projects")}
                className="text-white hover:text-purple-500"
              >
                Projects
              </Button>
              <Button
                variant="ghost"
                onClick={() => scrollToSection("how-it-works")}
                className="text-white hover:text-purple-500"
              >
                About
              </Button>
              <Button
                variant="ghost"
                onClick={() => scrollToSection("join-waitlist")}
                className="text-white hover:text-purple-500"
              >
                Join Waitlist
              </Button>
              <Button
                variant="ghost"
                className="text-sm font-medium text-white hover:text-purple-500"
              >
                Contact
              </Button>
            </nav>
            <div className="flex items-center gap-4 ml-4">
              <Link href="/sign-in">
                <Button
                  size="sm"
                  className="bg-purple-700 text-white hover:bg-purple-900"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="bg-purple-700 text-white hover:bg-purple-900"
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          </header>
          <main className="flex-1 pt-14 bg-black">
            <AnimatePresence>
              <motion.section
                key="hero"
                className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-black text-white"
                variants={sectionVariants}
                initial="hidden"
                animate={currentSection === 0 ? "visible" : "exit"}
              >
                <div className="container px-4 md:px-6">
                  <div className="flex flex-col items-center space-y-4 text-center pt-12">
                    <motion.h1
                      className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    >
                      Showcase Your Projects, Connect with Collaborators
                    </motion.h1>
                    <motion.p
                      className="mx-auto max-w-[700px] text-gray-400 md:text-xl"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    >
                      Share your work, find collaborators, and bring your ideas to life. Join our community of developers and innovators to collaborate on cutting-edge projects and discover exciting opportunities.
                    </motion.p>
                    <motion.div
                      className="space-x-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.6 }}
                    >
                      <Link href="/sign-up">
                      <Button className="bg-purple-700 text-white hover:bg-purple-900">
                        Get Started
                      </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="border-purple-500 text-purple-500 hover:bg-purple-700 hover:text-white"
                        onClick={scrollToSectionLearnMore}
                      >
                        Learn More
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </motion.section>

              <motion.section
                key="demo-video"
                id="demo-video"
                className="w-full py-12 md:py-24 lg:py-32 bg-black text-white"
                variants={sectionVariants}
                initial="hidden"
                animate={currentSection === 1 ? "visible" : "exit"}
              >
                <div className="container px-4 md:px-6">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8">
                    Watch Our Demo
                  </h2>
                  <motion.div
                    className="flex justify-center"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                  >
                    <ReactPlayer
                      url="https://www.youtube.com/embed/4xK9Hcqy31k?si=89N4llQfI6XU0G7G"
                      controls
                      width="75%"
                      height="480px"
                    />
                  </motion.div>
                </div>
              </motion.section>

              <motion.section
                key="how-it-works"
                id="how-it-works"
                className="w-full py-12 md:py-24 lg:py-32 bg-black text-white"
                variants={sectionVariants}
                initial="hidden"
                animate={currentSection === 2 ? "visible" : "exit"}
              >
                <div className="container px-4 md:px-6" ref={targetSectionRef}>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 text-white">
                    How It Works
                  </h2>
                  <p className="text-xl text-gray-400 mt-4 text-center">At DevConnect, we simplify the process of showcasing your projects and finding collaborators.</p>
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.2 }}
                  >
                    {[
                      {
                        icon: FileIcon,
                        title: "1. Post Your Project",
                        description:
                          "Share your work and ideas with our community",
                      },
                      {
                        icon: UsersIcon,
                        title: "2. Find Collaborators",
                        description:
                          "Connect with others who share your vision.",
                      },
                      {
                        icon: RocketIcon,
                        title: "3. Bring Ideas to Life",
                        description:
                          "Collaborate to create innovative solutions.",
                      },
                    ].map((step, index) => (
                      <motion.div
                        key={index}
                        className="flex flex-col items-center text-center"
                        variants={sectionVariants}
                      >
                        <div className="mb-4 rounded-full bg-gray-700 p-4">
                          <step.icon className="h-6 w-6 text-purple-500" />
                        </div>
                        <h3 className="text-xl font-bold text-purple-500">
                          {step.title}
                        </h3>
                        <p className="text-gray-300">{step.description}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.section>

              <motion.section
                key="featured-projects"
                id="featured-projects"
                className="w-full py-12 md:py-24 lg:py-32 bg-black text-white"
                variants={sectionVariants}
                initial="hidden"
                animate={currentSection === 3 ? "visible" : "exit"}
              >
                <div className="container px-4 md:px-6">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8">
                    Featured Projects
                  </h2>
                  <motion.div
                    className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ staggerChildren: 0.2 }}
                  >
                    <motion.div variants={sectionVariants}>
                      <Card className="bg-gray-800 border border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-purple-500 text-center">
                            Eco-friendly Smart Home
                          </CardTitle>
                          <CardDescription className="text-gray-400 text-center">
                            A sustainable living project
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-white text-center">
                            Innovative smart home solutions focusing on energy
                            efficiency and sustainability.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div variants={sectionVariants}>
                      <Card className="bg-gray-800 border border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-purple-500 text-center">
                            AI-powered Education Platform
                          </CardTitle>
                          <CardDescription className="text-gray-400 text-center">
                            Revolutionizing online learning
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-white text-center">
                            An adaptive learning platform that uses AI to
                            personalize education for each student.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div variants={sectionVariants}>
                      <Card className="bg-gray-800 border border-gray-700">
                        <CardHeader>
                          <CardTitle className="text-purple-500 text-center">
                            Community Marketplace App
                          </CardTitle>
                          <CardDescription className="text-gray-400 text-center">
                            Connecting local businesses and consumers
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-white text-center">
                            A mobile app that promotes local commerce and
                            strengthens community bonds.
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.section>

              <motion.section className="w-full py-24 bg-black text-white"
              key="faq"
              id="faq"
              initial="hidden"
              variants={sectionVariants}
              animate={currentSection === 4 ? "visible" : "exit"}>
                
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold">Frequently Asked Questions</h2>
                <p className="text-xl text-gray-400 mt-4">Got questions? We have answers!</p>
              </div>
              <div className="max-w-4xl mx-auto">
                <FAQItem question="What is DevConnect?" answer="DevConnect is a platform for developers to showcase their projects, collaborate with others, and discover cool new projects." />
                <FAQItem question="How can I join the platform?" answer="Sign up using the form on this page, and you'll be able to start posting your projects and finding collaborators." />
                <FAQItem question="Is DevConnect free?" answer="Yes, DevConnect is free to use for all developers." />
              </div>
            </motion.section>

              <Separator className="my-4 bg-black" />

              <motion.section
                key="join-waitlist"
                id="join-waitlist"
                className="w-full py-12 md:py-24 lg:py-32 bg-black"
                variants={sectionVariants}
                initial="hidden"
                animate={currentSection === 5 ? "visible" : "exit"}
              >
                <div className="container px-4 md:px-6">
                  <div className="flex flex-col items-center space-y-4 text-center">
                    <div className="space-y-2">
                      <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-purple-500">
                        Join the Waitlist
                      </h2>
                      <p className="mx-auto max-w-[600px] text-gray-400 md:text-xl">
                        Be among the first to experience our platform. Sign up
                        for early access and exclusive updates.
                      </p>
                    </div>
                    <div className="w-full max-w-sm space-y-2">
                      <form
                        onSubmit={handleSubmitWaitlist}
                        className="flex flex-col space-y-2"
                      >
                        <Input
                          placeholder="Your Name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="bg-gray-800 text-white placeholder-gray-400"
                        />
                        <Input
                          placeholder="Your Email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-gray-800 text-white placeholder-gray-400"
                        />
                        <Button
                          type="submit"
                          className="bg-purple-600 text-white hover:bg-purple-700"
                        >
                          Join Waitlist
                        </Button>
                      </form>
                      {message && <p className="text-gray-300">{message}</p>}
                      <p className="text-xs text-gray-400">
                        We respect your privacy and will never share your
                        information.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.section>
            </AnimatePresence>
          </main>
          <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 bg-black">
            <p className="text-xs text-gray-500 bg-black">
              © 2023 DevConnect. All rights reserved.
            </p>
            <nav className="sm:ml-auto flex gap-4 sm:gap-6 bg-black">
              <Link
                className="text-xs hover:underline underline-offset-4"
                href="#"
              >
                Terms of Service
              </Link>
              <Link
                className="text-xs hover:underline underline-offset-4"
                href="#"
              >
                Privacy
              </Link>
            </nav>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MountainIcon(
  props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
    </svg>
  );
}

function FileIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function UsersIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const FAQItem = ({ question, answer }: any) => (
  <div className="mb-6">
    <h4 className="text-xl font-bold text-purple-500">{question}</h4>
    <p className="text-gray-400 mt-2">{answer}</p>
  </div>
);

function RocketIcon(props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) {
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
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}
