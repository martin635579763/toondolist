
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, Applicant } from '@/types/task';
import { CreateTaskForm } from '@/components/toondo/CreateTaskForm';
import { EditTaskDialog } from '@/components/toondo/EditTaskDialog';
import { TaskCard } from '@/components/toondo/TaskCard';
import { PrintableTaskCard } from '@/components/toondo/PrintableTaskCard';
import { FileTextIcon, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, writeBatch, query, orderBy, Timestamp, where, getDoc } from 'firebase/firestore';

interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
  mainTaskHasIncompleteSubtasks: boolean;
}

interface DeleteTaskVariables {
  taskId: string;
  originalParentId?: string; // Added to pass client-known parentId
}

// Define a more specific return type for the delete mutation
interface DeleteTaskMutationResult {
  numRemoved: number;
  removedTaskTitle: string; // This will be taskId if not found
  parentIdOfDeletedTask?: string;
  status: 'deleted' | 'notFound';
}


const queryClient = new QueryClient();

function HomePageContent() {
  const { toast, dismiss } = useToast();
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const tasksCollection = collection(db, 'tasks');
      // Query to fetch tasks, ordered by 'order' (for main tasks) and then 'createdAt'
      const q = query(tasksCollection, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
      const tasksSnapshot = await getDocs(q);
      return tasksSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          // Ensure createdAt is a number (milliseconds)
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          // Ensure applicants is an array
          applicants: data.applicants || [],
        } as Task;
      });
    },
    refetchInterval: 60000, // Optional: refetch tasks every 60 seconds
  });

  // CREATE: Mutation for adding a new task to Firestore.
  const addTaskMutation = useMutation<string, Error, Task>({
    mutationFn: async (newTask) => {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...newTask,
        // Convert number back to Firestore Timestamp for createdAt
        createdAt: Timestamp.fromMillis(newTask.createdAt as number || Date.now()),
        // Ensure applicants is an array, even if undefined initially
        applicants: newTask.applicants || [],
      });
      return docRef.id;
    },
    onSuccess: (newId, newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "ToonDo Added!",
        description: `"${newTask.title}" is ready ${newTask.parentId ? 'as a sub-task!' : 'to be tackled!'}`,
      });
      // If a sub-task is added to a completed main task, mark the main task as incomplete
      if (newTask.parentId) {
        const parentTask = tasks.find(t => t.id === newTask.parentId);
        if (parentTask && parentTask.completed) {
          updateTaskMutation.mutate({ ...parentTask, completed: false, applicants: parentTask.applicants || [] });
        }
      }
    },
    onError: (error) => {
      toast({ title: "Error adding task", description: error.message, variant: "destructive" });
    },
  });

  // UPDATE: Mutation for updating an existing task in Firestore.
  const updateTaskMutation = useMutation<void, Error, Task>({
    mutationFn: async (updatedTask) => {
      const taskRef = doc(db, 'tasks', updatedTask.id);
      await updateDoc(taskRef, {
        ...updatedTask,
        // Convert number back to Firestore Timestamp for createdAt if it's a number
        createdAt: typeof updatedTask.createdAt === 'number' ? Timestamp.fromMillis(updatedTask.createdAt) : updatedTask.createdAt,
        applicants: updatedTask.applicants || [], // Ensure applicants is an array
      });
    },
    onSuccess: (_, updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Toast for update is handled by the calling function (e.g., handleUpdateTask)
      // to allow for more specific messages (e.g., if sub-tasks were also added)
    },
    onError: (error) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });

  // DELETE: Mutation for deleting a task from Firestore.
  const deleteTaskMutation = useMutation<
    DeleteTaskMutationResult, // Use the new result type
    Error,
    DeleteTaskVariables
  >({
    mutationFn: async (variables) => {
      const { taskId, originalParentId } = variables;
      const taskDocRef = doc(db, 'tasks', taskId);
      const taskSnapshot = await getDoc(taskDocRef);

      if (!taskSnapshot.exists()) {
        console.warn(`Task with ID ${taskId} not found in Firestore during delete. It might have been already deleted.`);
        // If task not found, still "succeed" in the sense that it's gone.
        // Return 'notFound' status. removedTaskTitle is set to taskId for the info toast.
        return { numRemoved: 0, removedTaskTitle: taskId, parentIdOfDeletedTask: originalParentId, status: 'notFound' };
      }
      
      const taskData = taskSnapshot.data() as Task; // Firestore data
      const currentTitle = taskData.title;
      const currentParentId = taskData.parentId;

      const batch = writeBatch(db);
      batch.delete(taskDocRef);
      let numRemoved = 1;

      // If it's a main task (according to Firestore's current state), delete its sub-tasks
      if (!currentParentId) {
        const subTasksQuery = query(collection(db, 'tasks'), where('parentId', '==', taskId));
        const subTasksSnapshot = await getDocs(subTasksQuery);
        subTasksSnapshot.forEach(subDoc => {
          batch.delete(subDoc.ref);
          numRemoved++;
        });
      }
      
      await batch.commit();
      return { numRemoved, removedTaskTitle: currentTitle, parentIdOfDeletedTask: currentParentId || originalParentId, status: 'deleted' };
    },
    onSuccess: (data) => { // data is DeleteTaskMutationResult
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      const { numRemoved, removedTaskTitle, parentIdOfDeletedTask, status } = data;
      
      if (status === 'notFound') {
        toast({
          title: "Info",
          description: `Task ID "${removedTaskTitle}" was already gone or could not be found.`,
        });
      } else { // status === 'deleted'
        toast({
          title: "ToonDo Removed!",
          description: `Task "${removedTaskTitle}" ${numRemoved > 1 ? 'and its sub-tasks were' : 'was'} removed.`,
        });
      }

      // If a sub-task was deleted (or a main task which might have had a parent in a different context, though unlikely here)
      // or if a task was 'notFound' but we had an originalParentId, check if parent needs auto-completion.
      if (parentIdOfDeletedTask) {
        // After refetching, check if the parent task can be auto-completed
        queryClient.refetchQueries({queryKey: ['tasks']}).then(() => {
          const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
          const parentTask = currentTasks.find(t => t.id === parentIdOfDeletedTask);

          if (parentTask && !parentTask.completed) {
            const remainingSubTasks = currentTasks.filter(st => st.parentId === parentIdOfDeletedTask);
            if (remainingSubTasks.length === 0 || remainingSubTasks.every(st => st.completed)) {
              // Only auto-complete if the task was actually deleted in this operation (numRemoved > 0)
              // or if it was notFound but we are sure about the parent.
              // The primary trigger for parent completion should be an actual sub-task state change.
              // If status is 'notFound', it implies the sub-task was already gone.
              // The parent state should reflect that already from previous operations or fetches.
              // However, an explicit check doesn't hurt if the client thought a sub-task existed.
              if (status === 'deleted' && numRemoved > 0) { // Ensure a sub-task was actually part of this delete op
                 updateTaskMutation.mutate({ ...parentTask, completed: true, applicants: parentTask.applicants || [] });
              } else if (remainingSubTasks.length === 0 || remainingSubTasks.every(st => st.completed)) {
                 // If notFound, but parent is incomplete and all its current known subtasks are complete (or none exist)
                 // this state implies it might be okay to complete the parent.
                 // This handles cases where the client might be out of sync for a moment.
                 updateTaskMutation.mutate({ ...parentTask, completed: true, applicants: parentTask.applicants || [] });
              }
            }
          }
        });
      }
    },
    onError: (error) => { // This will now primarily catch actual commit errors or unexpected issues
      toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
    },
  });


  const handleAddTask = (newTask: Task) => {
    // Add a default order for new main tasks; sub-tasks don't need a global order in the same way.
    const taskWithDefaults = {
      ...newTask,
      order: newTask.parentId ? undefined : (tasks.filter(t => !t.parentId).length), // Append to end of main tasks
      applicants: newTask.applicants || [], // Ensure applicants is initialized
    };
    addTaskMutation.mutate(taskWithDefaults);
  };

  const handleOpenEditDialog = (task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = (updatedTask: Task, newSubTasksToCreate?: Task[]) => {
    updateTaskMutation.mutate(updatedTask, {
      onSuccess: () => {
        let toastDescription = `"${updatedTask.title}" has been saved.`;
        if (newSubTasksToCreate && newSubTasksToCreate.length > 0) {
          newSubTasksToCreate.forEach(subTask => {
            // Assign parentId and default order for new sub-tasks
            const subTaskWithParent = {
              ...subTask,
              parentId: updatedTask.id,
              order: undefined, // Sub-tasks ordered by createdAt under parent
              applicants: [], // Initialize applicants for new sub-tasks
            };
            addTaskMutation.mutate(subTaskWithParent);
          });
          toastDescription += ` ${newSubTasksToCreate.length} new sub-task${newSubTasksToCreate.length > 1 ? 's were' : ' was'} added.`;
          
          // If main task was completed, but new incomplete sub-tasks were added, mark main task incomplete
          if (updatedTask.completed && !updatedTask.parentId) {
             const hasIncompleteNewSubtasks = newSubTasksToCreate.some(st => !st.completed);
             if (hasIncompleteNewSubtasks) {
                updateTaskMutation.mutate({...updatedTask, completed: false, applicants: updatedTask.applicants || []});
             }
          }
        }
        toast({
          title: "ToonDo Updated!",
          description: toastDescription,
        });
      }
    });
    handleCloseEditDialog();
  };

  const handleToggleComplete = (id: string) => {
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;

    const newCompletedStatus = !taskToToggle.completed;

    if (!taskToToggle.parentId) { // MAIN TASK
      const subTasks = tasks.filter(t => t.parentId === id);
      const hasIncompleteSubtasks = subTasks.some(st => !st.completed);

      if (newCompletedStatus && hasIncompleteSubtasks) {
        toast({
          title: "Still have work to do!",
          description: `"${taskToToggle.title}" cannot be completed until all its sub-tasks are done.`,
          variant: "default", // Or "destructive"
        });
        return; // Prevent marking main task complete
      }
      // If we reach here, either it's being marked incomplete, or it has no incomplete subtasks.
      updateTaskMutation.mutate({ ...taskToToggle, completed: newCompletedStatus, applicants: taskToToggle.applicants || [] });
      // Fireworks for main task completion handled in TaskCard.tsx
      // Specific toast for main task completion is removed to prioritize fireworks.
    } else { // SUB-TASK
      updateTaskMutation.mutate({ ...taskToToggle, completed: newCompletedStatus, applicants: taskToToggle.applicants || [] }, {
        onSuccess: () => {
          // After sub-task status changes, check parent task
          const parentId = taskToToggle.parentId;
          if (parentId) {
            // Refetch tasks to get the most current state for parent check
            queryClient.refetchQueries({queryKey: ['tasks']}).then(() => {
              const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
              const parentTask = currentTasks.find(t => t.id === parentId);
              if (parentTask) {
                const siblingSubTasks = currentTasks.filter(t => t.parentId === parentId);
                const allSubTasksNowComplete = siblingSubTasks.every(st => st.completed);

                if (allSubTasksNowComplete) {
                  if (!parentTask.completed) {
                    updateTaskMutation.mutate({ ...parentTask, completed: true, applicants: parentTask.applicants || [] });
                  }
                } else { // Some sub-tasks are incomplete
                  if (parentTask.completed) {
                    updateTaskMutation.mutate({ ...parentTask, completed: false, applicants: parentTask.applicants || [] });
                  }
                }
              }
            });
          }
        }
      });
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (!task || !task.id) {
      toast({title: "Error", description: "Task data is invalid for deletion.", variant: "destructive"});
      return;
    }
    // Pass taskId and its original parentId (if it's a sub-task)
    deleteTaskMutation.mutate({ taskId: task.id, originalParentId: task.parentId });
  };
  
  const actualPrint = useCallback(() => {
    if (printableAreaRef.current) {
      printableAreaRef.current.classList.remove('hidden');
      printableAreaRef.current.classList.add('print:block');
    }
    window.print();
    if (printableAreaRef.current) {
       printableAreaRef.current.classList.add('hidden');
       printableAreaRef.current.classList.remove('print:block');
    }
  }, []);

  const handleInitiatePrint = (task: Task) => {
    setTaskToPrint(task);
  };
  
  useEffect(() => {
    if (taskToPrint) {
      const timer = setTimeout(() => {
        actualPrint();
        setTaskToPrint(null); 
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [taskToPrint, actualPrint]);

  useEffect(() => {
    const afterPrintHandler = () => {
      if (printableAreaRef.current) {
        printableAreaRef.current.classList.add('hidden');
        printableAreaRef.current.classList.remove('print:block');
      }
      setTaskToPrint(null);
    };

    window.addEventListener('afterprint', afterPrintHandler);
    return () => {
      window.removeEventListener('afterprint', afterPrintHandler);
    };
  }, []);

  const handleDragStart = (mainTaskId: string) => {
    setDraggedItemId(mainTaskId);
  };

  const handleDragEnter = (mainTaskId: string) => {
    if (mainTaskId !== draggedItemId) {
      setDragOverItemId(mainTaskId);
    }
  };
  
  const handleDragLeave = () => {
    // Only clear if not dragging over another valid target that immediately follows
    // This basic implementation clears on any leave. More complex logic might be needed for nested targets.
    setDragOverItemId(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
  };

  // This handleDrop is for reordering main task groups
  const handleDrop = (droppedOnMainTaskId: string) => {
    if (!draggedItemId || draggedItemId === droppedOnMainTaskId || !droppedOnMainTaskId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Get the current list of main tasks in their display order
    const allMainTasksOriginal = tasks.filter(task => !task.parentId)
                                    .sort((a,b) => (a.order ?? (a.createdAt ?? 0) as number) - ((b.order ?? (b.createdAt ?? 0)) as number));
    
    const mainTaskIds = allMainTasksOriginal.map(t => t.id);
    const draggedIdx = mainTaskIds.indexOf(draggedItemId);
    const targetIdx = mainTaskIds.indexOf(droppedOnMainTaskId);

    if (draggedIdx === -1 || targetIdx === -1) {
      console.error("Drag and drop error: task ID not found in main task list.");
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Reorder the IDs
    const itemToMove = mainTaskIds.splice(draggedIdx, 1)[0];
    mainTaskIds.splice(targetIdx, 0, itemToMove);

    // Prepare batch update for Firestore
    const batch = writeBatch(db);
    mainTaskIds.forEach((id, index) => {
        const taskRef = doc(db, 'tasks', id);
        batch.update(taskRef, { order: index });
    });

    // Commit the batch and then update client state or refetch
    batch.commit().then(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] }); // Refetch to ensure order is correct
      toast({ title: "Tasks Reordered!", description: "Your ToonDos have a new sequence."});
    }).catch(error => {
      toast({ title: "Error reordering", description: error.message, variant: "destructive"});
    });
    
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const handleDragEnd = () => {
    // Clean up drag state
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  // Prepare tasks for display, grouping main tasks with their sub-tasks
  const taskGroups: TaskGroup[] = [];
  if (tasks && tasks.length > 0) {
    // Sort main tasks by their 'order' field, then 'createdAt' as a fallback
    const mainDisplayTasks = tasks.filter(task => !task.parentId)
                                  .sort((a,b) => ((a.order ?? (a.createdAt ?? 0)) as number) - ((b.order ?? (b.createdAt ?? 0)) as number));
    
    mainDisplayTasks.forEach(pt => {
      // Find sub-tasks for this parent, sort them by creation time
      const subTasksForThisParent = tasks.filter(st => st.parentId === pt.id)
                                      .sort((a,b) => ((a.createdAt || 0) as number) - ((b.createdAt || 0) as number)); // Ensure createdAt is a number
      const group: TaskGroup = {
        mainTask: pt,
        subTasks: subTasksForThisParent,
        mainTaskHasIncompleteSubtasks: subTasksForThisParent.some(st => !st.completed)
      };
      taskGroups.push(group);
    });
  }

  if (isLoadingTasks) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading your ToonDos...</p>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen text-center text-destructive">
        <h2 className="text-2xl font-semibold mb-2">Oops! Something went wrong.</h2>
        <p>Could not load your ToonDos. Please try refreshing the page.</p>
        <p className="text-sm mt-2">Error: {tasksError.message}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <header className="text-center mb-10">
        <h1 className="text-6xl font-bold text-primary" style={{ fontFamily: 'var(--font-comic-neue), cursive' }}>
          ToonDo List
        </h1>
        <p className="text-muted-foreground text-lg mt-2">Your fun &amp; colorful task manager!</p>
      </header>

      <CreateTaskForm onAddTask={handleAddTask} />
      
      {taskGroups.length === 0 && !isLoadingTasks ? (
         <div className="text-center py-16">
          <FileTextIcon className="mx-auto h-24 w-24 text-muted-foreground opacity-50 mb-4" />
          <h2 className="text-3xl font-semibold mb-2">No ToonDos Yet!</h2>
          <p className="text-muted-foreground text-lg">Time to add some fun tasks to your list.</p>
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 items-start' // Ensure items-start for consistent vertical alignment
          )}
        >
          {/* Render tasks grouped by main task and its sub-tasks */}
          {taskGroups.map(({ mainTask, subTasks, mainTaskHasIncompleteSubtasks }) => (
            <div
              key={mainTask.id}
              className="flex flex-col gap-2" // This div groups a main task and its sub-tasks visually
              // Drag and drop handlers are on this group container
              draggable={true} // Only main task groups are draggable
              onDragStart={(e) => { e.stopPropagation(); handleDragStart(mainTask.id);}}
              onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(mainTask.id);}}
              onDragLeave={(e) => { e.stopPropagation(); handleDragLeave();}}
              onDrop={(e) => { e.stopPropagation(); handleDrop(mainTask.id);}}
              onDragOver={(e) => { e.stopPropagation(); handleDragOver(e);}} // Allow dropping over the entire group
              onDragEnd={(e) => { e.stopPropagation(); handleDragEnd();}}
            >
              <TaskCard
                task={mainTask}
                allTasks={tasks} // Pass all tasks for context (finding parent/children)
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask} // Pass the function that accepts Task
                onPrint={handleInitiatePrint}
                onEdit={handleOpenEditDialog}
                isDraggingSelf={draggedItemId === mainTask.id}
                isDragOverSelf={dragOverItemId === mainTask.id && draggedItemId !== mainTask.id}
                isMainTaskWithIncompleteSubtasks={mainTaskHasIncompleteSubtasks}
              />
              {subTasks.map(subTask => (
                <TaskCard
                  key={subTask.id}
                  task={subTask}
                  allTasks={tasks}
                  onToggleComplete={handleToggleComplete}
                  onDelete={handleDeleteTask} // Pass the function that accepts Task
                  onPrint={handleInitiatePrint}
                  onEdit={handleOpenEditDialog}
                  isDraggingSelf={false} // Sub-tasks are not independently draggable in this model
                  isDragOverSelf={false} // Sub-tasks are not drop targets for reordering main groups
                  isMainTaskWithIncompleteSubtasks={false} // Sub-tasks don't have this specific state
                />
              ))}
            </div>
          ))}
        </div>
      )}
      
      <div id="printable-area" ref={printableAreaRef} className="hidden">
        {taskToPrint && <PrintableTaskCard task={taskToPrint} />}
      </div>

      {editingTask && (
        <EditTaskDialog
          isOpen={isEditDialogOpen}
          onClose={handleCloseEditDialog}
          taskToEdit={editingTask}
          onSaveTask={handleUpdateTask}
        />
      )}

      <footer className="text-center mt-16 py-8 border-t border-border">
        <p className="text-muted-foreground">
          &copy; {new Date().getFullYear()} ToonDo List. Make your tasks fun!
        </p>
      </footer>
    </div>
    </TooltipProvider>
  );
}

export default function HomePage() {
  // Provide the query client to the entire component tree
  return (
    <QueryClientProvider client={queryClient}>
      <HomePageContent />
    </QueryClientProvider>
  );
}

