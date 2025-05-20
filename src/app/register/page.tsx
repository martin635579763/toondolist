
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  displayName: z.string().min(1, 'Display name is required'),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser, isLoading: authLoading } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit: SubmitHandler<RegisterFormInputs> = async (data) => {
    setIsSubmitting(true);
    await registerUser(data.username, data.password, data.displayName, data.avatarUrl);
    setIsSubmitting(false);
  };

  const pageLoading = authLoading || isSubmitting;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Forge Your Legend</CardTitle>
          <CardDescription>Create your ToonDo account to manage your epic quests.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" {...register('displayName')} placeholder="e.g., Sir Reginald" disabled={pageLoading} />
              {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...register('username')} placeholder="Your unique hero tag" disabled={pageLoading} />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} placeholder="A strong secret phrase" disabled={pageLoading} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} placeholder="Repeat your secret phrase" disabled={pageLoading} />
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="avatarUrl">Avatar URL (Optional)</Label>
              <Input id="avatarUrl" {...register('avatarUrl')} placeholder="Link to your portrait (e.g., https://...)" disabled={pageLoading} />
              {errors.avatarUrl && <p className="text-xs text-destructive">{errors.avatarUrl.message}</p>}
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={pageLoading}>
              {pageLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Join the Guild
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground">
            Already a hero?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Enter the Gates!
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

