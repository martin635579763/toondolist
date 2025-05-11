import type {Metadata} from 'next';
import { Comic_Neue } from 'next/font/google'; // Using a more playful font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const comicNeue = Comic_Neue({
  weight: ["400", "700"],
  subsets: ['latin'],
  variable: '--font-comic-neue',
});

export const metadata: Metadata = {
  title: 'ToonDo List',
  description: 'A fun, cartoon-style ToDo list!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", comicNeue.variable)}>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
