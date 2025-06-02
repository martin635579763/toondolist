
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getRandomColor, cartoonColors } from "@/lib/colors";
import type { Task } from "@/types/task";
import { generateId } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

const subTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
});

type SubTaskFormData = z.infer<typeof subTaskFormSchema>;

interface AddSubTaskFormProps {
  parentId: string;
  onAddTask: (task: Task) => void; // Re-using the main onAddTask for simplicity
  onSubTaskAdded: () => void; // To close the popover
}

export function AddSubTaskForm({ parentId, onAddTask, onSubTaskAdded }: AddSubTaskFormProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubTaskFormData>({
    resolver: zodResolver(subTaskFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const onSubmit: SubmitHandler<SubTaskFormData> = (data) => {
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to add sub-tasks.", variant: "destructive" });
      return;
    }

    const newSubTask: Task = {
      id: generateId(),
      title: data.title,
      description: data.description || "",
      completed: false,
      dueDate: null,
      color: cartoonColors[Math.floor(Math.random() * cartoonColors.length)], // Or inherit/derive color
      createdAt: Date.now(),
      parentId: parentId,
      applicants: [],
      userId: currentUser.id,
      userDisplayName: currentUser.displayName,
      userAvatarUrl: currentUser.avatarUrl,
    };

    onAddTask(newSubTask);
    reset();
    onSubTaskAdded(); // Close the popover
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-popover text-popover-foreground rounded-lg w-72">
      <div className="space-y-1">
        <Label htmlFor={`subtask-title-${parentId}`} className="text-sm font-medium">Sub-Task Title</Label>
        <Input
          id={`subtask-title-${parentId}`}
          {...register("title")}
          placeholder="e.g., Draft the outline"
          className="text-sm"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`subtask-description-${parentId}`} className="text-sm font-medium">Description (Optional)</Label>
        <Textarea
          id={`subtask-description-${parentId}`}
          {...register("description")}
          placeholder="Add details..."
          className="text-sm min-h-[60px]"
          rows={2}
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <Button type="submit" className="w-full text-sm py-2">
        Add Sub-Task
      </Button>
    </form>
  );
}
