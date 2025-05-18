
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task } from '@/types/task';
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
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, writeBatch, query, orderBy, Timestamp } from 'firebase/firestore';

interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
  mainTaskHasIncompleteSubtasks: boolean;
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

  // READ: Fetch all tasks from Firestore. Main tasks and sub-tasks are fetched together.
  // Main tasks are sorted by their 'order' field, then 'createdAt'.
  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const tasksCollection = collection(db, 'tasks');
      // Order by 'order' for main tasks, then 'createdAt' as a secondary sort.
      // Sub-tasks will be client-side sorted by 'createdAt' under their parent.
      const q = query(tasksCollection, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
      const tasksSnapshot = await getDocs(q);
      return tasksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Ensure createdAt is a number (milliseconds) for client-side logic if it's a Firestore Timestamp
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        } as Task;
      });
    },
    // Keep data fresh, but not too aggressively.
    refetchInterval: 60000, // Refetch every 60 seconds
  });

  // CREATE: Mutation for adding a task to Firestore.
  // Handles both main tasks (no parentId, includes 'order') and sub-tasks.
  const addTaskMutation = useMutation<string, Error, Task>({
    mutationFn: async (newTask) => {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...newTask,
        // Ensure createdAt is a Firestore Timestamp for consistent server-side ordering
        createdAt: Timestamp.fromMillis(newTask.createdAt || Date.now()),
      });
      return docRef.id;
    },
    onSuccess: (newId, newTask) => { // newTask here is the one passed to mutate()
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "ToonDo Added!",
        description: `"${newTask.title}" is ready ${newTask.parentId ? 'as a sub-task!' : 'to be tackled!'}`,
      });
       // If a new sub-task is added to a completed parent, mark parent incomplete
      if (newTask.parentId) {
        const parentTask = tasks.find(t => t.id === newTask.parentId);
        if (parentTask && parentTask.completed) {
          updateTaskMutation.mutate({ ...parentTask, completed: false });
        }
      }
    },
    onError: (error) => {
      toast({ title: "Error adding task", description: error.message, variant: "destructive" });
    },
  });

  // UPDATE: Mutation for updating a task in Firestore.
  // Handles updates to main tasks (including roles, applicants) and sub-tasks.
  const updateTaskMutation = useMutation<void, Error, Task>({
    mutationFn: async (updatedTask) => {
      const taskRef = doc(db, 'tasks', updatedTask.id);
      await updateDoc(taskRef, { 
        ...updatedTask,
        // Ensure createdAt is a Firestore Timestamp if it's being updated
        createdAt: typeof updatedTask.createdAt === 'number' ? Timestamp.fromMillis(updatedTask.createdAt) : updatedTask.createdAt,
      });
    },
    onSuccess: (_, updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Toast is handled by the calling function for more specific messages
    },
    onError: (error) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });

  // DELETE: Mutation for deleting a task from Firestore.
  // If a main task is deleted, its sub-tasks are also deleted in a batch.
  const deleteTaskMutation = useMutation<
    { numRemoved: number; removedTaskTitle: string; parentId?: string },
    Error,
    string
  >({
    mutationFn: async (taskId) => {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (!taskToDelete) throw new Error("Task not found");

      const batch = writeBatch(db);
      const taskRef = doc(db, 'tasks', taskId);
      batch.delete(taskRef);

      let numRemoved = 1;
      // If it's a main task, delete its sub-tasks
      if (!taskToDelete.parentId) {
        const subTasksToDelete = tasks.filter(t => t.parentId === taskId);
        subTasksToDelete.forEach(subTask => {
          const subTaskRef = doc(db, 'tasks', subTask.id);
          batch.delete(subTaskRef);
          numRemoved++;
        });
      }
      await batch.commit();
      return { numRemoved, removedTaskTitle: taskToDelete.title, parentId: taskToDelete.parentId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      const { numRemoved, removedTaskTitle, parentId } = data;
      
      toast({
        title: "ToonDo Removed!",
        description: `Task "${removedTaskTitle}" ${numRemoved > 1 ? 'and its sub-tasks were' : 'was'} removed.`,
      });

      // If a sub-task was deleted, check if parent can be auto-completed
      if (parentId) {
        const parentTask = tasks.find(t => t.id === parentId);
        if (parentTask) {
          // Find remaining sub-tasks *after* deletion from the latest task list (or assume deletion was successful)
          const remainingSubTasks = tasks.filter(st => st.parentId === parentId && st.id !== data.removedTaskTitle); // This line is problematic, ID is not title
          
          // Correct way to find remaining subtasks requires knowing the deleted task's ID
          // This part needs re-evaluation based on queryClient invalidation timing or passing deleted task ID explicitly
          const currentParentTaskState = tasks.find(t => t.id === parentId);
          if (currentParentTaskState) {
              const currentSubtasks = tasks.filter(st => st.parentId === parentId && st.id !== (tasks.find(t => t.title === removedTaskTitle)?.id) ); // Assuming title is unique for now, which is not safe
               if (currentSubtasks.every(st => st.completed) && !currentParentTaskState.completed) {
                 // updateTaskMutation.mutate({ ...currentParentTaskState, completed: true });
                 // No toast here for parent auto-completion, fireworks is the indicator.
               }
          }
        }
      }
    },
    onError: (error) => {
      toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
    },
  });


  const handleAddTask = (newTask: Task) => {
    // For new main tasks, assign an initial order.
    // This logic could be more sophisticated, e.g., max(existing orders) + 1
    // CreateTaskForm already provides a default 'order: 0'
    addTaskMutation.mutate(newTask);
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
          newSubTasksToCreate.forEach(subTask => addTaskMutation.mutate(subTask));
          toastDescription += ` ${newSubTasksToCreate.length} new sub-task${newSubTasksToCreate.length > 1 ? 's were' : ' was'} added.`;
          
          if (updatedTask.completed) {
             updateTaskMutation.mutate({...updatedTask, completed: false});
             // Toast for parent task update due to new sub-tasks is handled by fireworks or general update toast
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
          variant: "default",
        });
        return;
      }
      updateTaskMutation.mutate({ ...taskToToggle, completed: newCompletedStatus });
      // Fireworks for main task completion handled in TaskCard.tsx
      // No explicit toast here; fireworks is the indicator.
    } else { // SUB-TASK
      updateTaskMutation.mutate({ ...taskToToggle, completed: newCompletedStatus }, {
        onSuccess: () => {
          const parentId = taskToToggle.parentId;
          if (parentId) {
            const parentTask = tasks.find(t => t.id === parentId);
            if (parentTask) {
              const siblingSubTasks = tasks.filter(t => t.parentId === parentId);
              const allSubTasksNowComplete = siblingSubTasks.every(st => st.id === id ? newCompletedStatus : st.completed);

              if (allSubTasksNowComplete) {
                if (!parentTask.completed) {
                  updateTaskMutation.mutate({ ...parentTask, completed: true });
                  // Fireworks for parent auto-completion handled in TaskCard.tsx
                  // No explicit toast here.
                }
              } else {
                if (parentTask.completed) {
                  updateTaskMutation.mutate({ ...parentTask, completed: false });
                }
              }
            }
          }
        }
      });
    }
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) {
      toast({title: "Error", description: "Task not found for deletion.", variant: "destructive"});
      return;
    }
    
    const parentIdOfDeleted = taskToDelete.parentId;

    deleteTaskMutation.mutate(id, {
        onSuccess: (data) => { // data here is { numRemoved, removedTaskTitle, parentId }
             // If a sub-task was deleted, check if its parent (which is still in 'tasks' due to query invalidation lag)
             // can now be auto-completed.
            if (parentIdOfDeleted) {
                const parentTask = tasks.find(t => t.id === parentIdOfDeleted);
                if (parentTask) {
                    // Filter current tasks to find siblings of the deleted task.
                    // The deleted task itself will be gone after query invalidation.
                    // For immediate check, we rely on the fact that 'tasks' is stale here.
                    const remainingSubTasks = tasks.filter(st => st.parentId === parentIdOfDeleted && st.id !== id);
                    if (remainingSubTasks.every(st => st.completed) && !parentTask.completed) {
                         updateTaskMutation.mutate({ ...parentTask, completed: true });
                         // No toast for parent auto-completion.
                    }
                }
            }
        }
    });
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
    setDragOverItemId(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
  };

  // UPDATE (Order): Handles drag-and-drop reordering of main tasks.
  // Updates the 'order' field of affected main tasks in Firestore.
  const handleDrop = (droppedOnMainTaskId: string) => {
    if (!draggedItemId || draggedItemId === droppedOnMainTaskId || !droppedOnMainTaskId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const allMainTasksOriginal = tasks.filter(task => !task.parentId)
                                    .sort((a,b) => (a.order ?? (a.createdAt ?? 0)) - (b.order ?? (b.createdAt ?? 0)));
    
    const mainTaskIds = allMainTasksOriginal.map(t => t.id);
    const draggedIdx = mainTaskIds.indexOf(draggedItemId);
    const targetIdx = mainTaskIds.indexOf(droppedOnMainTaskId);

    if (draggedIdx === -1 || targetIdx === -1) {
      console.error("Drag and drop error: task ID not found in main task list.");
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const itemToMove = mainTaskIds.splice(draggedIdx, 1)[0];
    mainTaskIds.splice(targetIdx, 0, itemToMove);

    const batch = writeBatch(db);
    mainTaskIds.forEach((id, index) => {
        const taskRef = doc(db, 'tasks', id);
        batch.update(taskRef, { order: index });
    });

    batch.commit().then(() => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "Tasks Reordered!", description: "Your ToonDos have a new sequence."});
    }).catch(error => {
      toast({ title: "Error reordering", description: error.message, variant: "destructive"});
    });
    
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  // Prepare tasks for display, grouping main tasks with their sub-tasks.
  // Main tasks are sorted by 'order', then 'createdAt'. Sub-tasks by 'createdAt'.
  const taskGroups: TaskGroup[] = [];
  if (tasks && tasks.length > 0) {
    const mainDisplayTasks = tasks.filter(task => !task.parentId)
                                  .sort((a,b) => (a.order ?? (a.createdAt ?? 0)) - (b.order ?? (b.createdAt ?? 0)));
    
    mainDisplayTasks.forEach(pt => {
      const subTasksForThisParent = tasks.filter(st => st.parentId === pt.id)
                                      .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0)); 
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
      
      {taskGroups.length === 0 && !isLoadingTasks ? ( // Use taskGroups here
         <div className="text-center py-16">
          <FileTextIcon className="mx-auto h-24 w-24 text-muted-foreground opacity-50 mb-4" />
          <h2 className="text-3xl font-semibold mb-2">No ToonDos Yet!</h2>
          <p className="text-muted-foreground text-lg">Time to add some fun tasks to your list.</p>
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 items-start'
          )}
        >
          {taskGroups.map(({ mainTask, subTasks, mainTaskHasIncompleteSubtasks }) => (
            <div
              key={mainTask.id}
              className="flex flex-col gap-2" 
              // Drag and drop handlers are on this group wrapper for main tasks
              draggable={true}
              onDragStart={(e) => { e.stopPropagation(); handleDragStart(mainTask.id);}}
              onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(mainTask.id);}}
              onDragLeave={(e) => { e.stopPropagation(); handleDragLeave();}}
              onDrop={(e) => { e.stopPropagation(); handleDrop(mainTask.id);}}
              onDragOver={(e) => { e.stopPropagation(); handleDragOver(e);}} 
              onDragEnd={(e) => { e.stopPropagation(); handleDragEnd();}}
            >
              <TaskCard
                task={mainTask}
                allTasks={tasks} 
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
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
                  onDelete={handleDeleteTask}
                  onPrint={handleInitiatePrint}
                  onEdit={handleOpenEditDialog}
                  // Sub-tasks themselves are not directly draggable in this model
                  isDraggingSelf={false} 
                  isDragOverSelf={false} 
                  isMainTaskWithIncompleteSubtasks={false} 
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
  return (
    <QueryClientProvider client={queryClient}>
      <HomePageContent />
    </QueryClientProvider>
  );
}

    