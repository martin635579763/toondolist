
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, generateId } from "@/lib/utils";
import type { Task } from "@/types/task";
import { useToast } from "@/hooks/use-toast";
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title can be at most 100 characters"),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface CreateTaskFormProps {
  onAddTask: (task: Task) => void;
  onTaskCreated?: () => void; // Optional: Callback after task is created
}

export function CreateTaskForm({ onAddTask, onTaskCreated }: CreateTaskFormProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
    },
  });

  const onSubmit: SubmitHandler<TaskFormData> = (data) => {
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to create tasks.", variant: "destructive" });
      return;
    }

    const currentTime = Date.now();

    const mainTask: Task = {
      id: generateId(),
      title: data.title,
      description: "", // Initialize with empty description
      completed: false,
      dueDate: null, // Initialize with null due date
      createdAt: currentTime,
      assignedRoles: [], // Initialize with empty roles
      applicants: [],
      checklistItems: [], // Initialize with empty checklist
      order: 0, // This will be re-calculated in page.tsx when added to the list
      userId: currentUser.id,
      userDisplayName: currentUser.displayName,
      userAvatarUrl: currentUser.avatarUrl,
    };
    onAddTask(mainTask);

    reset();
    if (onTaskCreated) {
      onTaskCreated();
    }
  };

  if (!currentUser && !onTaskCreated) { // This case might not be hit if popover is always triggered by logged-in user
    return (
      <Card className="p-6 bg-card shadow-xl rounded-xl mb-8 border border-border text-center">
        <CardTitle className="text-xl">Welcome, Adventurer!</CardTitle>
        <CardDescription className="mt-2">Please log in or register to create and manage your ToonDo quests.</CardDescription>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 md:p-6 bg-popover text-popover-foreground rounded-xl border-border">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-lg font-semibold">New ToonDo Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="What needs to be done?"
          className="text-base"
          autoFocus
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <Button type="submit" className="w-full text-lg py-3 h-auto">
        Add ToonDo
      </Button>
    </form>
  );
}
