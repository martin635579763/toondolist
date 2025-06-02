
"use client";

import type { FormEvent} from 'react';
import { useState } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, SparklesIcon, InfoIcon, Loader2, UsersIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn, generateId } from "@/lib/utils";
import type { Task } from "@/types/task";
import { suggestDueDate } from "@/ai/flows/suggest-due-date";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  dueDate: z.date().nullable().optional(),
  assignedRoles: z.string().optional(), // Comma-separated roles
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface CreateTaskFormProps {
  onAddTask: (task: Task) => void;
  onTaskCreated?: () => void; // Optional: Callback after task is created
}

export function CreateTaskForm({ onAddTask, onTaskCreated }: CreateTaskFormProps) {
  const { currentUser } = useAuth();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSuggestingDate, setIsSuggestingDate] = useState(false);
  const [suggestedDateReasoning, setSuggestedDateReasoning] = useState<string | null>(null);

  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: null,
      assignedRoles: "",
    },
  });

  const taskDescriptionForAISuggestion = watch("description");
  const taskTitleForAISuggestion = watch("title");
  const currentDueDate = watch("dueDate");

  const handleSuggestDueDate = async () => {
    if (!taskTitleForAISuggestion && !taskDescriptionForAISuggestion) {
      toast({
        title: "Hmm...",
        description: "Please enter a title or description for the task first.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingDate(true);
    setSuggestedDateReasoning(null);
    try {
      const result = await suggestDueDate({ taskDescription: `${taskTitleForAISuggestion}${taskDescriptionForAISuggestion ? ': ' + taskDescriptionForAISuggestion : ''}` });
      if (result.suggestedDueDate) {
        const parsedDate = parseISO(result.suggestedDueDate);
        setValue("dueDate", parsedDate, { shouldValidate: true });
        setSuggestedDateReasoning(result.reasoning);
        toast({
          title: "Due Date Suggested!",
          description: `AI suggested ${format(parsedDate, "PPP")}. ${result.reasoning ? `Reason: ${result.reasoning.substring(0,50)}...` : ''}`,
        });
      } else if (result.reasoning) {
         toast({
          title: "AI Suggestion",
          description: result.reasoning,
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error suggesting due date:", error);
      let description = "Could not suggest a due date. Please try again or set it manually.";
      if (error instanceof Error && (error.message.includes('plugin not configured') || error.message.includes('GOOGLE_API_KEY'))) {
        description = "Could not suggest a due date. AI features may not be configured (e.g., API key missing).";
      } else if (error instanceof Error && error.message.includes('GENKIT_API_KEY')) {
        description = "Could not suggest a due date. AI features may not be configured (e.g., API key missing).";
      }
      toast({
        title: "Oops!",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsSuggestingDate(false);
    }
  };

  const onSubmit: SubmitHandler<TaskFormData> = (data) => {
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to create tasks.", variant: "destructive" });
      return;
    }

    const rolesArray = data.assignedRoles
      ? data.assignedRoles.split(',').map(role => role.trim()).filter(role => role !== "")
      : [];

    const currentTime = Date.now();

    const mainTask: Task = {
      id: generateId(),
      title: data.title,
      description: data.description || "",
      completed: false,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      createdAt: currentTime,
      assignedRoles: rolesArray.length > 0 ? rolesArray : undefined,
      applicants: [],
      checklistItems: [], // Initialize with empty checklist
      order: 0,
      userId: currentUser.id,
      userDisplayName: currentUser.displayName,
      userAvatarUrl: currentUser.avatarUrl,
    };
    onAddTask(mainTask);

    reset();
    setSuggestedDateReasoning(null);
    if (onTaskCreated) {
      onTaskCreated();
    }
  };

  if (!currentUser && !onTaskCreated) {
    return (
      <Card className="p-6 bg-card shadow-xl rounded-xl mb-8 border border-border text-center">
        <CardTitle className="text-xl">Welcome, Adventurer!</CardTitle>
        <CardDescription className="mt-2">Please log in or register to create and manage your ToonDo quests.</CardDescription>
      </Card>
    );
  }

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 md:p-6 bg-popover text-popover-foreground rounded-xl border-border">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-lg font-semibold">Task Title</Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="e.g., Conquer the world!"
          className="text-base"
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-lg font-semibold">Description (Optional)</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Add more details, like secret plans..."
          className="text-base"
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 flex-grow">
          <Label htmlFor="dueDate" className="text-lg font-semibold">Due Date (Optional)</Label>
          <div className="flex items-center gap-2">
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-10 text-base",
                    !currentDueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-5 w-5" />
                  {currentDueDate ? format(currentDueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentDueDate || undefined}
                  onSelect={(date) => {
                    setValue("dueDate", date || null, { shouldValidate: true });
                    setShowDatePicker(false);
                    setSuggestedDateReasoning(null);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={handleSuggestDueDate}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  disabled={isSuggestingDate}
                  aria-label="Suggest Due Date"
                >
                  {isSuggestingDate ? <Loader2 className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5 text-primary" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Suggest Due Date with AI</TooltipContent>
            </Tooltip>
              {suggestedDateReasoning && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-5 w-5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm font-medium">AI Suggestion Reasoning:</p>
                    <p className="text-xs">{suggestedDateReasoning}</p>
                  </TooltipContent>
                </Tooltip>
              )}
          </div>
          {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedRoles" className="text-lg font-semibold flex items-center">
            <UsersIcon className="mr-2 h-5 w-5" /> Assign Roles/People (Optional)
          </Label>
          <Input
            id="assignedRoles"
            {...register("assignedRoles")}
            placeholder="e.g., Designer, Bass Player, Coder"
            className="text-base"
            aria-describedby="roles-description"
          />
           <p id="roles-description" className="text-xs text-muted-foreground">Comma-separated list of roles or names.</p>
          {errors.assignedRoles && <p className="text-sm text-destructive">{errors.assignedRoles.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full text-lg py-3 h-auto">
        Add ToonDo Task!
      </Button>
    </form>
    </TooltipProvider>
  );
}
