
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
import { CalendarIcon, SparklesIcon, InfoIcon, Loader2, LightbulbIcon, ListChecks } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn, generateId } from "@/lib/utils";
import { getRandomColor } from "@/lib/colors";
import type { Task, TaskBreakdownStep } from "@/types/task";
import { suggestDueDate } from "@/ai/flows/suggest-due-date";
import { suggestTaskBreakdown } from "@/ai/flows/suggest-task-breakdown";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  
  const [isSuggestingBreakdown, setIsSuggestingBreakdown] = useState(false);
  const [suggestedBreakdown, setSuggestedBreakdown] = useState<TaskBreakdownStep[] | null>(null);
  const [breakdownSummary, setBreakdownSummary] = useState<string | null>(null);

  const { toast } = useToast();
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<TaskFormData>({
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
      } else if (result.reasoning) { // Handle cases where only reasoning is returned (e.g. API key issue)
         toast({
          title: "AI Suggestion",
          description: result.reasoning,
          variant: "default",
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

  const handleSuggestBreakdown = async () => {
    if (!taskTitleForAISuggestion) {
      toast({
        title: "Hmm...",
        description: "Please enter a title for the task first to suggest a breakdown.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingBreakdown(true);
    setSuggestedBreakdown(null);
    setBreakdownSummary(null);
    try {
      const result = await suggestTaskBreakdown({ 
        taskTitle: taskTitleForAISuggestion,
        taskDescription: taskDescriptionForAISuggestion 
      });
      if (result.summary) {
        setBreakdownSummary(result.summary);
      }
      if (result.breakdown && result.breakdown.length > 0) {
        setSuggestedBreakdown(result.breakdown);
        toast({
          title: "Task Breakdown Suggested!",
          description: result.summary || "AI has provided a task breakdown.",
        });
      } else if (result.summary) { // Even if breakdown is empty, show summary
         toast({
          title: "AI Suggestion",
          description: result.summary,
        });
      }
    } catch (error) {
      console.error("Error suggesting task breakdown:", error);
      toast({
        title: "Oops!",
        description: "Could not suggest a task breakdown. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingBreakdown(false);
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
      suggestedBreakdown: suggestedBreakdown || undefined,
      breakdownSummary: breakdownSummary || undefined,
    };
    onAddTask(newTask);
    reset(); // Reset form fields
    setSuggestedDateReasoning(null);
    setSuggestedBreakdown(null);
    setBreakdownSummary(null);
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
      
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
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

        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                type="button"
                onClick={handleSuggestBreakdown}
                variant="outline"
                className="shrink-0 h-10"
                disabled={isSuggestingBreakdown}
                aria-label="Suggest Task Breakdown"
                >
                {isSuggestingBreakdown ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <LightbulbIcon className="h-5 w-5 mr-2 text-yellow-500" />}
                Suggest Breakdown
                </Button>
            </TooltipTrigger>
            <TooltipContent>Get AI suggestions for sub-tasks and roles</TooltipContent>
        </Tooltip>
      </div>

      { (breakdownSummary || (suggestedBreakdown && suggestedBreakdown.length > 0)) && (
        <Card className="mt-4 border-dashed border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/> AI Suggested Breakdown</CardTitle>
            {breakdownSummary && <CardDescription className="text-sm">{breakdownSummary}</CardDescription>}
          </CardHeader>
          {suggestedBreakdown && suggestedBreakdown.length > 0 && (
            <CardContent className="text-sm space-y-2 pt-2">
              <ul className="list-disc pl-5 space-y-1">
                {suggestedBreakdown.map((item, index) => (
                  <li key={index}>
                    <strong>{item.step}</strong>
                    {item.requiredRole && <span className="text-xs text-muted-foreground ml-1">(Role: {item.requiredRole})</span>}
                    {item.details && <p className="text-xs pl-2 text-muted-foreground">{item.details}</p>}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}


      <Button type="submit" className="w-full text-lg py-3 h-auto">
        Add ToonDo Task!
      </Button>
    </form>
    </TooltipProvider>
  );
}
