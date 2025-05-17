
"use client";

import type { Task } from "@/types/task";
import { useEffect, useState } from 'react';
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
import { cn } from "@/lib/utils";
import { suggestDueDate } from "@/ai/flows/suggest-due-date";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const editTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  dueDate: z.date().nullable().optional(),
});

type EditTaskFormData = z.infer<typeof editTaskFormSchema>;

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit: Task | null;
  onSaveTask: (updatedTask: Task) => void;
}

export function EditTaskDialog({ isOpen, onClose, taskToEdit, onSaveTask }: EditTaskDialogProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSuggestingDate, setIsSuggestingDate] = useState(false);
  const [suggestedDateReasoning, setSuggestedDateReasoning] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskFormSchema),
  });

  const taskDescriptionForAISuggestion = watch("description");
  const taskTitleForAISuggestion = watch("title");
  const currentDueDate = watch("dueDate");

  useEffect(() => {
    if (taskToEdit) {
      reset({
        title: taskToEdit.title,
        description: taskToEdit.description || "",
        dueDate: taskToEdit.dueDate ? parseISO(taskToEdit.dueDate) : null,
      });
      setSuggestedDateReasoning(null);
    } else {
      reset({ title: "", description: "", dueDate: null });
       setSuggestedDateReasoning(null);
    }
  }, [taskToEdit, reset, isOpen]); // Also reset on isOpen to handle re-opening for same task

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
        });
      }
    } catch (error) {
      console.error("Error suggesting due date:", error);
      let description = "Could not suggest a due date. Please try again or set it manually.";
      if (error instanceof Error && (error.message.includes('plugin not configured') || error.message.includes('GOOGLE_API_KEY'))) {
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

  const onSubmit: SubmitHandler<EditTaskFormData> = (data) => {
    if (!taskToEdit) return;

    const updatedTask: Task = {
      ...taskToEdit,
      title: data.title,
      description: data.description || "",
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
    };
    onSaveTask(updatedTask);
  };
  
  const handleDialogClose = () => {
    reset({ title: "", description: "", dueDate: null }); // Reset form on close
    setSuggestedDateReasoning(null);
    onClose();
  };


  if (!taskToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg bg-card shadow-xl rounded-xl border border-border">
        <TooltipProvider>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader className="pt-2 pb-4">
              <DialogTitle className="text-2xl font-semibold">Edit ToonDo Task</DialogTitle>
              <DialogDescription>
                Make changes to your task details below. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-lg font-semibold">Task Title</Label>
                <Input
                  id="edit-title"
                  {...register("title")}
                  placeholder="e.g., Conquer the world!"
                  className="text-base"
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-lg font-semibold">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  {...register("description")}
                  placeholder="Add more details, like secret plans..."
                  className="text-base"
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate" className="text-lg font-semibold">Due Date (Optional)</Label>
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
            </div>
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" className="text-base">Save Changes</Button>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
