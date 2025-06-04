
"use client";

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon, UserCircleIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <UserCircleIcon className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">My Profile</CardTitle>
          <CardDescription>Your personal space in the realm of ToonDos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24 border-4 border-primary/50">
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} data-ai-hint="user portrait" />
              <AvatarFallback className="bg-primary/20 text-primary text-4xl">
                {currentUser.displayName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-semibold text-center" style={{fontFamily: 'var(--font-medieval-sharp), cursive'}}>{currentUser.displayName}</h2>
              <p className="text-sm text-muted-foreground text-center">@{currentUser.username}</p>
            </div>
          </div>

          <div className="text-center p-4 bg-muted/30 rounded-md border border-border">
            <p className="text-sm text-muted-foreground">
              Further details like an introduction, showcased works, and historical project participation can be added here in future updates.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to My ToonDos
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
