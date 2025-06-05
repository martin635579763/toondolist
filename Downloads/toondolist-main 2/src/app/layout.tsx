
import type {Metadata} from 'next';
import { Aldrich } from 'next/font/google'; // Changed font to Aldrich
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/contexts/AuthContext';

const aldrich = Aldrich({ // Initialize Aldrich
  subsets: ['latin'],
  weight: ['400'], // Aldrich only supports '400' weight
  variable: '--font-aldrich', // Set CSS variable for Aldrich
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
      <body className={cn("min-h-screen bg-background font-sans antialiased", aldrich.variable)}> {/* Apply Aldrich font */}
        <AuthProvider>
          <main>{children}</main>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
