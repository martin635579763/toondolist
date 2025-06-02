
"use client";

// This component is now deprecated as its functionality has been moved
// directly into src/app/page.tsx for a simpler inline task creation experience.
// It can be safely deleted from the project.

// import { useForm, type SubmitHandler } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import * as z from "zod";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { cn, generateId } from "@/lib/utils";
// import type { Task } from "@/types/task";
// import { useToast } from "@/hooks/use-toast";
// import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { useAuth } from '@/contexts/AuthContext';

// const taskFormSchema = z.object({
//   title: z.string().min(1, "Title is required").max(100, "Title can be at most 100 characters"),
// });

// type TaskFormData = z.infer<typeof taskFormSchema>;

// interface CreateTaskFormProps {
//   onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'order' | 'userId' | 'userDisplayName' | 'userAvatarUrl' | 'applicants' | 'checklistItems'>) => void;
//   onTaskCreated?: () => void; 
// }

// export function CreateTaskForm({ onAddTask, onTaskCreated }: CreateTaskFormProps) {
//   const { currentUser } = useAuth();
//   const { toast } = useToast();

//   const { register, handleSubmit, formState: { errors }, reset } = useForm<TaskFormData>({
//     resolver: zodResolver(taskFormSchema),
//     defaultValues: {
//       title: "",
//     },
//   });

//   const onSubmit: SubmitHandler<TaskFormData> = (data) => {
//     if (!currentUser) {
//       toast({ title: "Not Logged In", description: "You must be logged in to create tasks.", variant: "destructive" });
//       return;
//     }

//     const mainTaskOmit: Omit<Task, 'id' | 'createdAt' | 'order' | 'userId' | 'userDisplayName' | 'userAvatarUrl' | 'applicants' | 'checklistItems'> = {
//       title: data.title,
//       description: "", 
//       completed: false,
//       dueDate: null, 
//       assignedRoles: [], 
//     };
//     onAddTask(mainTaskOmit);

//     reset();
//     if (onTaskCreated) {
//       onTaskCreated();
//     }
//   };
  
//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 md:p-6 bg-popover text-popover-foreground rounded-xl border-border">
//       <div className="space-y-2">
//         <Label htmlFor="title" className="text-lg font-semibold">New ToonDo Title</Label>
//         <Input
//           id="title"
//           {...register("title")}
//           placeholder="What needs to be done?"
//           className="text-base"
//           autoFocus
//         />
//         {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
//       </div>

//       <Button type="submit" className="w-full text-lg py-3 h-auto">
//         Add ToonDo
//       </Button>
//     </form>
//   );
// }

export {}; // Keep file for build system if needed, but it's not used.
