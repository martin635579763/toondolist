"use client";

import type { ChangeEvent, FormEvent} from 'react';
import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, SparklesIcon, InfoIcon, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn, generateId } from "@/lib/utils";
import { getRandomColor } from "@/lib/colors";
import type { Task } from "@/types/task";
import { suggestDueDate } from "@/ai/flows/suggest-due-date";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  dueDate: z.date().nullable().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface CreateTaskFormProps {
  onAddTask: (task: Task) => void;
}

export function CreateTaskForm({ onAddTask }: CreateTaskFormProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSuggestingDate, setIsSuggestingDate] = useState(false);
  const [suggestedDateReasoning, setSuggestedDateReasoning] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: null,
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
      }
    } catch (error) {
      console.error("Error suggesting due date:", error);
      toast({
        title: "Oops!",
        description: "Could not suggest a due date. Please try again or set it manually.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingDate(false);
    }
  };

  const onSubmit: SubmitHandler<TaskFormData> = (data) => {
    const newTask: Task = {
      id: generateId(),
      title: data.title,
      description: data.description || "",
      completed: false,
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      color: getRandomColor(),
      createdAt: Date.now(),
    };
    onAddTask(newTask);
    setValue("title", "");
    setValue("description", "");
    setValue("dueDate", null);
    setSuggestedDateReasoning(null);
  };

  return (
    <TooltipProvider>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6 bg-card shadow-xl rounded-xl mb-8 border border-border">
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
      
      <div className="space-y-2">
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
                  setSuggestedDateReasoning(null); // Clear AI reasoning if manual date is picked
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
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

      <Button type="submit" className="w-full text-lg py-3 h-auto">
        Add ToonDo Task!
      </Button>
    </form>
    </TooltipProvider>
  );
}
