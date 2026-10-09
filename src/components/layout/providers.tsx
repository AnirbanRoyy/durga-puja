"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { YouTubePlayerProvider } from "@/components/music/youtube-player-provider";
import { MiniPlayer } from "@/components/music/mini-player";

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            <TooltipProvider>
                <YouTubePlayerProvider>
                    {children}
                    <MiniPlayer />
                </YouTubePlayerProvider>
                <Toaster richColors position="top-center" />
            </TooltipProvider>
        </ThemeProvider>
    );
}
