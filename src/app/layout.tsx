
import type {Metadata} from 'next';
import { Nunito } from 'next/font/google'; // Changed font to Nunito
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/contexts/AuthContext';

const nunito = Nunito({ // Initialize Nunito
  subsets: ['latin'],
  variable: '--font-nunito', // Set CSS variable for Nunito
});

export const metadata: Metadata = {
  title: 'BrickBuild ToDo - Assemble Your Tasks', // Updated title for Lego theme
  description: 'A Lego-style ToDo list for your creative projects!', // Updated description for Lego theme
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", nunito.variable)}> {/* Apply Nunito font */}
        <AuthProvider>
          <main>{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
