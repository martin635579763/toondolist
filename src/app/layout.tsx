import type {Metadata} from 'next';
import { MedievalSharp } from 'next/font/google'; // Changed font
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const medievalSharp = MedievalSharp({ // Changed font
  weight: ["400"], // MedievalSharp typically only has a 400 weight
  subsets: ['latin'],
  variable: '--font-medieval-sharp', // Changed variable name
});

export const metadata: Metadata = {
  title: 'ToonDo List - Realm of Tasks', // Updated title
  description: 'A fantasy-style ToDo list for your epic quests!', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", medievalSharp.variable)}>
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
