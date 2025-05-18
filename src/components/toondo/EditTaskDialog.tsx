
"use client";

import type { Task, TaskBreakdownStep, Applicant } from "@/types/task";
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
import { CalendarIcon, SparklesIcon, InfoIcon, Loader2, ListChecks, PlusCircleIcon, XCircleIcon, UsersIcon, UserPlusIcon, Trash2Icon, CheckIcon, XIcon } from "lucide-react"; // Removed UserCheckIcon, UserXIcon
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getRandomColor } from "@/lib/colors";
import { Badge } from "@/components/ui/badge";


const editTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  dueDate: z.date().nullable().optional(),
  assignedRoles: z.string().optional(), 
});

type EditTaskFormData = z.infer<typeof editTaskFormSchema>;

interface EditTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit: Task | null;
  onSaveTask: (updatedTask: Task, newSubTasksToCreate?: Task[]) => void;
}

export function EditTaskDialog({ isOpen, onClose, taskToEdit, onSaveTask }: EditTaskDialogProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSuggestingDate, setIsSuggestingDate] = useState(false);
  const [suggestedDateReasoning, setSuggestedDateReasoning] = useState<string | null>(null);
  const [newSubTaskSteps, setNewSubTaskSteps] = useState<TaskBreakdownStep[]>([]);
  
  const [currentApplicants, setCurrentApplicants] = useState<Applicant[]>([]);
  const [newApplicantName, setNewApplicantName] = useState('');
  const [selectedRoleForApplicant, setSelectedRoleForApplicant] = useState<string>('');


  const { toast } = useToast();

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset, getValues } = useForm<EditTaskFormData>({
    resolver: zodResolver(editTaskFormSchema),
  });

  const taskDescriptionForAISuggestion = watch("description");
  const taskTitleForAISuggestion = watch("title");
  const currentDueDate = watch("dueDate");
  const currentAssignedRolesString = watch("assignedRoles");


  useEffect(() => {
    if (taskToEdit) {
      reset({
        title: taskToEdit.title,
        description: taskToEdit.description || "",
        dueDate: taskToEdit.dueDate ? parseISO(taskToEdit.dueDate) : null,
        assignedRoles: taskToEdit.assignedRoles ? taskToEdit.assignedRoles.join(', ') : "",
      });
      setSuggestedDateReasoning(null);
      setNewSubTaskSteps([]);
      setCurrentApplicants(taskToEdit.applicants || []);
      setNewApplicantName('');
      setSelectedRoleForApplicant(taskToEdit.assignedRoles && taskToEdit.assignedRoles.length > 0 ? taskToEdit.assignedRoles[0] : '');

    } else {
      reset({ title: "", description: "", dueDate: null, assignedRoles: "" });
       setSuggestedDateReasoning(null);
       setNewSubTaskSteps([]);
       setCurrentApplicants([]);
       setNewApplicantName('');
       setSelectedRoleForApplicant('');
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

  const handleAddApplicant = () => {
    if (!newApplicantName.trim() || !selectedRoleForApplicant) {
      toast({ title: "Missing Info", description: "Please enter applicant name and select a role.", variant: "destructive"});
      return;
    }
    const newId = generateId();
    setCurrentApplicants(prev => [...prev, { id: newId, name: newApplicantName, role: selectedRoleForApplicant, status: 'pending' }]);
    setNewApplicantName(''); 
  };

  const handleApplicantStatusChange = (applicantId: string, newStatus: 'accepted' | 'rejected') => {
    setCurrentApplicants(prevApplicants => {
      const applicantToUpdate = prevApplicants.find(app => app.id === applicantId);
      if (!applicantToUpdate) return prevApplicants;

      let updatedApplicants = prevApplicants.map(app => 
        app.id === applicantId ? { ...app, status: newStatus } : app
      );

      if (newStatus === 'accepted') {
        updatedApplicants = updatedApplicants.map(app => {
          if (app.role === applicantToUpdate.role && app.id !== applicantId && app.status === 'accepted') {
            return { ...app, status: 'pending' }; 
          }
          return app;
        });
      }
      return updatedApplicants;
    });
  };
  
  const handleRemoveApplicant = (applicantId: string) => {
    setCurrentApplicants(prev => prev.filter(app => app.id !== applicantId));
  };


  const onSubmit: SubmitHandler<EditTaskFormData> = (data) => {
    if (!taskToEdit) return;

    const rolesArray = data.assignedRoles
      ? data.assignedRoles.split(',').map(role => role.trim()).filter(role => role !== "")
      : [];

    const updatedTaskData: Partial<Task> = { // Use Partial<Task> as not all fields are directly from form
      title: data.title,
      description: data.description || "",
      dueDate: data.dueDate ? data.dueDate.toISOString() : null,
      assignedRoles: rolesArray.length > 0 ? rolesArray : undefined,
      applicants: currentApplicants,
    };

    const updatedTask: Task = {
      ...taskToEdit,
      ...updatedTaskData,
    };


    const subTasksToCreate: Task[] = newSubTaskSteps.map((step, index) => {
      if (step.step.trim() === "") return null;
      const currentTime = Date.now();
      return {
        id: generateId(),
        title: step.step,
        description: `${step.details || ""}${step.requiredRole ? ` (Role: ${step.requiredRole})` : ""}`.trim(),
        completed: false,
        dueDate: null, 
        color: getRandomColor(),
        createdAt: currentTime + index + 1, 
        parentId: taskToEdit.id,
        applicants: [],
        order: index,
      };
    }).filter(task => task !== null) as Task[];
    
    onSaveTask(updatedTask, subTasksToCreate.length > 0 ? subTasksToCreate : undefined);
    setNewSubTaskSteps([]); 
  };
  
  const handleDialogClose = () => {
    reset({ title: "", description: "", dueDate: null, assignedRoles: "" }); 
    setSuggestedDateReasoning(null);
    setNewSubTaskSteps([]);
    setCurrentApplicants([]);
    setNewApplicantName('');
    setSelectedRoleForApplicant('');
    onClose();
  };

  const parsedAssignedRoles = currentAssignedRolesString?.split(',').map(r => r.trim()).filter(r => r) || [];


  if (!taskToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl bg-card shadow-xl rounded-xl border border-border">
        <TooltipProvider>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader className="pt-2 pb-4">
              <DialogTitle className="text-2xl font-semibold">Edit ToonDo Task</DialogTitle>
              <DialogDescription>
                Make changes to your task details below. You can also add new sub-tasks or manage role applicants if this is a main task.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-3 custom-scrollbar"> {/* Added custom-scrollbar if you have one defined */}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {!taskToEdit.parentId && ( 
                  <div className="space-y-2">
                    <Label htmlFor="edit-assignedRoles" className="text-lg font-semibold flex items-center">
                       <UsersIcon className="mr-2 h-5 w-5" /> Needed Roles/People
                    </Label>
                    <Input
                      id="edit-assignedRoles"
                      {...register("assignedRoles")}
                      placeholder="e.g., Designer, Bass Player"
                      className="text-base"
                      aria-describedby="edit-roles-description"
                    />
                    <p id="edit-roles-description" className="text-xs text-muted-foreground">Comma-separated list of roles.</p>
                    {errors.assignedRoles && <p className="text-sm text-destructive">{errors.assignedRoles.message}</p>}
                  </div>
                )}
              </div>


              {!taskToEdit.parentId && ( 
                <>
                  <Card className="border-dashed border-secondary/50 mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-md flex items-center"><UserPlusIcon className="mr-2 h-5 w-5 text-secondary"/>Manage Role Applicants</CardTitle>
                      <CardDescription className="text-sm">Add applicants for the roles defined above. Accept or reject pending applications.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="space-y-1 sm:col-span-1">
                          <Label htmlFor="new-applicant-name" className="text-xs">Applicant Name</Label>
                          <Input 
                            id="new-applicant-name"
                            value={newApplicantName}
                            onChange={(e) => setNewApplicantName(e.target.value)}
                            placeholder="e.g., John Doe"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-1">
                          <Label htmlFor="new-applicant-role" className="text-xs">Applying for Role</Label>
                          <Select 
                            value={selectedRoleForApplicant} 
                            onValueChange={setSelectedRoleForApplicant}
                            disabled={!parsedAssignedRoles || parsedAssignedRoles.length === 0}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {parsedAssignedRoles.map(role => (
                                <SelectItem key={role} value={role} className="text-sm">{role}</SelectItem>
                              ))}
                              {(!parsedAssignedRoles || parsedAssignedRoles.length === 0) && (
                                 <div className="px-2 py-1.5 text-sm text-muted-foreground">Define roles first</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" onClick={handleAddApplicant} size="sm" className="sm:self-end" disabled={!parsedAssignedRoles || parsedAssignedRoles.length === 0}>
                          <UserPlusIcon className="mr-1.5 h-4 w-4"/>Add Applicant
                        </Button>
                      </div>

                      {currentApplicants.length > 0 && (
                        <div className="space-y-2 pt-3 border-t">
                          <Label className="text-sm font-medium">Current Applicants</Label>
                          {currentApplicants.map(applicant => (
                            <div key={applicant.id} className="flex items-center justify-between p-2 border rounded-md bg-background/50">
                              <div className="flex-grow">
                                <p className="text-sm font-semibold">{applicant.name}</p>
                                <p className="text-xs text-muted-foreground">Role: {applicant.role}</p>
                                <Badge 
                                  variant={applicant.status === 'accepted' ? 'default' : applicant.status === 'rejected' ? 'destructive' : 'secondary'}
                                  className="mt-1 text-xs py-0 px-1.5"
                                  style={applicant.status === 'accepted' ? {backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))'} : {}}
                                >
                                  Status: {applicant.status}
                                </Badge>
                              </div>
                              <div className="flex space-x-1 shrink-0">
                                {applicant.status === 'pending' && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleApplicantStatusChange(applicant.id, 'accepted')}>
                                          <CheckIcon className="h-4 w-4"/>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Accept</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleApplicantStatusChange(applicant.id, 'rejected')}>
                                          <XIcon className="h-4 w-4"/>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Reject</p></TooltipContent>
                                    </Tooltip>
                                  </>
                                )}
                                 <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveApplicant(applicant.id)}>
                                      <Trash2Icon className="h-4 w-4"/>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Remove Applicant</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {currentApplicants.length === 0 && (!parsedAssignedRoles || parsedAssignedRoles.length === 0) && (
                         <p className="text-xs text-center text-muted-foreground py-2">Define needed roles for this task first to add applicants.</p>
                      )}
                       {currentApplicants.length === 0 && (parsedAssignedRoles && parsedAssignedRoles.length > 0) && (
                         <p className="text-xs text-center text-muted-foreground py-2">No applicants yet for the defined roles.</p>
                      )}
                    </CardContent>
                  </Card>

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
                </>
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
