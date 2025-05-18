
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
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, writeBatch, query, orderBy, Timestamp, where, getDoc } from 'firebase/firestore';

interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
  mainTaskHasIncompleteSubtasks: boolean;
}

interface DeleteTaskVariables {
  taskId: string;
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
      const q = query(tasksCollection, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
      const tasksSnapshot = await getDocs(q);
      return tasksSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
        } as Task;
      });
    },
    refetchInterval: 60000,
  });

  const addTaskMutation = useMutation<string, Error, Task>({
    mutationFn: async (newTask) => {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...newTask,
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

  const updateTaskMutation = useMutation<void, Error, Task>({
    mutationFn: async (updatedTask) => {
      const taskRef = doc(db, 'tasks', updatedTask.id);
      await updateDoc(taskRef, {
        ...updatedTask,
        createdAt: typeof updatedTask.createdAt === 'number' ? Timestamp.fromMillis(updatedTask.createdAt) : updatedTask.createdAt,
        applicants: updatedTask.applicants || [], // Ensure applicants is an array
      });
    },
    onSuccess: (_, updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Toast handled by calling function or specific logic elsewhere
    },
    onError: (error) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });

  // DELETE: Mutation for deleting a task from Firestore.
  const deleteTaskMutation = useMutation<
    { numRemoved: number; removedTaskTitle: string; parentIdOfDeletedTask?: string },
    Error,
    DeleteTaskVariables // Pass taskId and its original parentId if known
  >({
    mutationFn: async ({ taskId }) => {
      const taskDocRef = doc(db, 'tasks', taskId);
      const taskSnapshot = await getDoc(taskDocRef);

      if (!taskSnapshot.exists()) {
        // Task already deleted or never existed, but client might think it did.
        // Consider this a "success" for user experience if the goal is for it to be gone.
        // Or throw an error to indicate it wasn't found.
        // Let's throw an error for clarity if it's not found, as mutationFn expects to operate on existing task.
         throw new Error(`Task with ID ${taskId} not found in Firestore for deletion.`);
      }
      const taskData = taskSnapshot.data() as Task; // Firestore data
      const currentTitle = taskData.title;
      const currentParentId = taskData.parentId;

      const batch = writeBatch(db);
      batch.delete(taskDocRef);
      let numRemoved = 1;

      // If it's a main task (according to Firestore's current state)
      if (!currentParentId) {
        const subTasksQuery = query(collection(db, 'tasks'), where('parentId', '==', taskId));
        const subTasksSnapshot = await getDocs(subTasksQuery);
        subTasksSnapshot.forEach(subDoc => {
          batch.delete(subDoc.ref);
          numRemoved++;
        });
      }
      
      await batch.commit();
      return { numRemoved, removedTaskTitle: currentTitle, parentIdOfDeletedTask: currentParentId };
    },
    onSuccess: (data, variables) => { // variables is { taskId }
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      const { numRemoved, removedTaskTitle, parentIdOfDeletedTask } = data;
      
      toast({
        title: "ToonDo Removed!",
        description: `Task "${removedTaskTitle}" ${numRemoved > 1 ? 'and its sub-tasks were' : 'was'} removed.`,
      });

      if (parentIdOfDeletedTask) {
        // After refetching, check if the parent task can be auto-completed
        queryClient.refetchQueries({queryKey: ['tasks']}).then(() => {
          const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
          const parentTask = currentTasks.find(t => t.id === parentIdOfDeletedTask);

          if (parentTask && !parentTask.completed) {
            const remainingSubTasks = currentTasks.filter(st => st.parentId === parentIdOfDeletedTask);
            if (remainingSubTasks.every(st => st.completed)) {
              updateTaskMutation.mutate({ ...parentTask, completed: true, applicants: parentTask.applicants || [] });
            }
          }
        });
      }
    },
    onError: (error) => {
      toast({ title: "Error deleting task", description: error.message, variant: "destructive" });
    },
  });


  const handleAddTask = (newTask: Task) => {
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
          
          if (updatedTask.completed && !updatedTask.parentId) { // Only main tasks
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
          variant: "default",
        });
        return;
      }
      updateTaskMutation.mutate({ ...taskToToggle, completed: newCompletedStatus, applicants: taskToToggle.applicants || [] });
      // Fireworks for main task completion handled in TaskCard.tsx
    } else { // SUB-TASK
      updateTaskMutation.mutate({ ...taskToToggle, completed: newCompletedStatus, applicants: taskToToggle.applicants || [] }, {
        onSuccess: () => {
          const parentId = taskToToggle.parentId;
          if (parentId) {
            const parentTask = tasks.find(t => t.id === parentId);
            if (parentTask) {
              // Get updated list of sub-tasks for the parent
              // Ideally, use refetched data or be cautious with client-side 'tasks' array
              const siblingSubTasks = tasks.filter(t => t.parentId === parentId);
              const allSubTasksNowComplete = siblingSubTasks.every(st => st.id === id ? newCompletedStatus : st.completed);

              if (allSubTasksNowComplete) {
                if (!parentTask.completed) {
                  updateTaskMutation.mutate({ ...parentTask, completed: true, applicants: parentTask.applicants || [] });
                }
              } else {
                if (parentTask.completed) {
                  updateTaskMutation.mutate({ ...parentTask, completed: false, applicants: parentTask.applicants || [] });
                }
              }
            }
          }
        }
      });
    }
  };

  const handleDeleteTask = (task: Task) => { // Accept full task object
    if (!task || !task.id) {
      toast({title: "Error", description: "Task data is invalid for deletion.", variant: "destructive"});
      return;
    }
    deleteTaskMutation.mutate({ taskId: task.id });
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

  const handleDrop = (droppedOnMainTaskId: string) => {
    if (!draggedItemId || draggedItemId === droppedOnMainTaskId || !droppedOnMainTaskId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

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
  
  const taskGroups: TaskGroup[] = [];
  if (tasks && tasks.length > 0) {
    const mainDisplayTasks = tasks.filter(task => !task.parentId)
                                  .sort((a,b) => ((a.order ?? (a.createdAt ?? 0)) as number) - ((b.order ?? (b.createdAt ?? 0)) as number));
    
    mainDisplayTasks.forEach(pt => {
      const subTasksForThisParent = tasks.filter(st => st.parentId === pt.id)
                                      .sort((a,b) => ((a.createdAt || 0) as number) - ((b.createdAt || 0) as number)); 
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
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 items-start'
          )}
        >
          {taskGroups.map(({ mainTask, subTasks, mainTaskHasIncompleteSubtasks }) => (
            <div
              key={mainTask.id}
              className="flex flex-col gap-2" 
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
