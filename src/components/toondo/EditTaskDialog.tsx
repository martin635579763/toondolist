
"use client";

import type { Task, TaskBreakdownStep } from "@/types/task";
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
import { CalendarIcon, SparklesIcon, InfoIcon, Loader2, ListChecks, PlusCircleIcon, XCircleIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn, generateId } from "@/lib/utils";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Added CardTitle
import { getRandomColor } from "@/lib/colors";


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
  onSaveTask: (updatedTask: Task, newSubTasksToCreate?: Task[]) => void; // Updated signature
}

export function EditTaskDialog({ isOpen, onClose, taskToEdit, onSaveTask }: EditTaskDialogProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSuggestingDate, setIsSuggestingDate] = useState(false);
  const [suggestedDateReasoning, setSuggestedDateReasoning] = useState<string | null>(null);
  const [newSubTaskSteps, setNewSubTaskSteps] = useState<TaskBreakdownStep[]>([]);
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
      setNewSubTaskSteps([]); // Clear any pending new sub-tasks
    } else {
      reset({ title: "", description: "", dueDate: null });
       setSuggestedDateReasoning(null);
       setNewSubTaskSteps([]);
    }
  }, [taskToEdit, reset, isOpen]);

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

  const handleAddSubTaskStep = () => {
    setNewSubTaskSteps(prev => [...prev, { step: '', details: '', requiredRole: '' }]);
  };

  const handleRemoveSubTaskStep = (index: number) => {
    setNewSubTaskSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubTaskStepChange = (index: number, field: keyof TaskBreakdownStep, value: string) => {
    setNewSubTaskSteps(prev => 
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const onSubmit: SubmitHandler<EditTaskFormData> = (data) => {
    if (!taskToEdit) return;

    const updatedTask: Task = {
      ...taskToEdit,
      title: data.title,
      description: data.description || "",
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
    };

    const subTasksToCreate: Task[] = newSubTaskSteps.map(step => {
      if (step.step.trim() === "") return null; // Skip empty steps
      return {
        id: generateId(),
        title: step.step,
        description: `${step.details || ""}${step.requiredRole ? ` (Role: ${step.requiredRole})` : ""}`.trim(),
        completed: false,
        dueDate: null, 
        color: getRandomColor(),
        createdAt: Date.now() + 1, 
        parentId: taskToEdit.id,
      };
    }).filter(task => task !== null) as Task[];
    
    onSaveTask(updatedTask, subTasksToCreate.length > 0 ? subTasksToCreate : undefined);
    setNewSubTaskSteps([]); // Clear after saving
  };
  
  const handleDialogClose = () => {
    reset({ title: "", description: "", dueDate: null }); 
    setSuggestedDateReasoning(null);
    setNewSubTaskSteps([]);
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
                Make changes to your task details below. You can also add new sub-tasks.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-3">
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

              {!taskToEdit.parentId && ( // Only show for main tasks
                <Card className="border-dashed border-primary/50 mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Add New Sub-Tasks</CardTitle>
                    <CardDescription className="text-sm">Break this main task into smaller new sub-tasks. Each step will become its own ToonDo card linked to this one.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {newSubTaskSteps.map((step, index) => (
                        <div key={index} className="p-3 border rounded-md space-y-2 relative bg-background/50">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveSubTaskStep(index)}
                            aria-label="Remove step"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                          <div>
                            <Label htmlFor={`new-sub-step-title-${index}`} className="text-xs">New Sub-Task Title (Step {index + 1})</Label>
                            <Input
                              id={`new-sub-step-title-${index}`}
                              value={step.step}
                              onChange={(e) => handleSubTaskStepChange(index, 'step', e.target.value)}
                              placeholder="Title for this new sub-task"
                              className="text-sm mt-0.5"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`new-sub-step-details-${index}`} className="text-xs">New Sub-Task Details (Optional)</Label>
                            <Textarea
                              id={`new-sub-step-details-${index}`}
                              value={step.details || ""}
                              onChange={(e) => handleSubTaskStepChange(index, 'details', e.target.value)}
                              placeholder="Further details for this new sub-task"
                              className="text-sm mt-0.5 min-h-[40px]"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`new-sub-step-role-${index}`} className="text-xs">Assigned Role for New Sub-Task (Optional)</Label>
                            <Input
                              id={`new-sub-step-role-${index}`}
                              value={step.requiredRole || ""}
                              onChange={(e) => handleSubTaskStepChange(index, 'requiredRole', e.target.value)}
                              placeholder="e.g., Designer, Developer"
                              className="text-sm mt-0.5"
                            />
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={handleAddSubTaskStep} className="mt-2">
                        <PlusCircleIcon className="mr-2 h-4 w-4" /> Add New Sub-Task Step
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <DialogFooter className="pt-4 mt-2 border-t">
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

    
