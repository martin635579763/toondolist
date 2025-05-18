
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
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, writeBatch, query, orderBy, Timestamp, where, getDoc, setDoc } from 'firebase/firestore';

interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
  mainTaskHasIncompleteSubtasks: boolean;
}

interface DeleteTaskVariables {
  taskId: string;
  originalParentId?: string;
}

interface DeleteTaskMutationResult {
  numRemoved: number;
  removedTaskTitle: string;
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
      const q = query(tasksCollection, orderBy('order', 'asc'), orderBy('createdAt', 'asc'));
      const tasksSnapshot = await getDocs(q);
      return tasksSnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          applicants: data.applicants || [],
        } as Task;
      });
    },
  });

  // CREATE: Mutation for adding a new task to Firestore using setDoc with client-generated ID.
  const addTaskMutation = useMutation<void, Error, Task>({
    mutationFn: async (newTask) => {
      if (!newTask.id) {
        throw new Error("Task ID is missing for setDoc operation.");
      }
      const taskRef = doc(db, 'tasks', newTask.id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...taskData } = newTask; // Exclude id from the data payload

      await setDoc(taskRef, {
        ...taskData,
        createdAt: Timestamp.fromMillis(newTask.createdAt as number || Date.now()),
        applicants: newTask.applicants || [],
        order: newTask.order ?? 0, // Ensure order has a default value
      });
    },
    onSuccess: (_, newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "ToonDo Added!",
        description: `"${newTask.title}" is ready ${newTask.parentId ? 'as a sub-task!' : 'to be tackled!'}`,
      });
      if (newTask.parentId) {
        const parentTask = tasks.find(t => t.id === newTask.parentId);
        if (parentTask && parentTask.completed) {
           const updatedParent = { ...parentTask, completed: false, applicants: parentTask.applicants || [] };
           // Ensure 'order' is not undefined
           if (typeof updatedParent.order === 'undefined' && !updatedParent.parentId) {
             updatedParent.order = tasks.filter(t => !t.parentId).length;
           }
           updateTaskMutation.mutate(updatedParent);
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...taskDataToUpdate } = updatedTask; // Exclude id from the data payload

      await updateDoc(taskRef, {
        ...taskDataToUpdate,
        createdAt: typeof updatedTask.createdAt === 'number' ? Timestamp.fromMillis(updatedTask.createdAt) : updatedTask.createdAt,
        applicants: updatedTask.applicants || [],
        // Ensure 'order' is not undefined if it's a main task being updated
        order: typeof updatedTask.order === 'number' ? updatedTask.order : (updatedTask.parentId ? undefined : 0),
      });
    },
    onSuccess: (_, updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Toast for update is handled by the calling function (e.g., handleUpdateTask)
    },
    onError: (error) => {
      toast({ title: "Error updating task", description: error.message, variant: "destructive" });
    },
  });

  // DELETE: Mutation for deleting a task from Firestore.
  const deleteTaskMutation = useMutation<
    DeleteTaskMutationResult,
    Error,
    DeleteTaskVariables
  >({
    mutationFn: async (variables) => {
      const { taskId, originalParentId } = variables;
      const taskDocRef = doc(db, 'tasks', taskId);
      const taskSnapshot = await getDoc(taskDocRef);

      if (!taskSnapshot.exists()) {
        console.warn(`Task with ID ${taskId} not found in Firestore during delete. It might have been already deleted.`);
        return { numRemoved: 0, removedTaskTitle: taskId, parentIdOfDeletedTask: originalParentId, status: 'notFound' };
      }
      
      const taskData = taskSnapshot.data() as Task; 
      const currentTitle = taskData.title;
      const currentParentId = taskData.parentId;

      const batch = writeBatch(db);
      batch.delete(taskDocRef);
      let numRemoved = 1;

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      const { numRemoved, removedTaskTitle, parentIdOfDeletedTask, status } = data;
      
      if (status === 'notFound') {
        toast({
          title: "Info",
          description: `Task ID "${removedTaskTitle}" was already gone or could not be found.`,
        });
      } else { 
        toast({
          title: "ToonDo Removed!",
          description: `Task "${removedTaskTitle}" ${numRemoved > 1 ? 'and its sub-tasks were' : 'was'} removed.`,
        });
      }

      if (parentIdOfDeletedTask) {
        queryClient.refetchQueries({queryKey: ['tasks']}).then(() => {
          const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
          const parentTask = currentTasks.find(t => t.id === parentIdOfDeletedTask);

          if (parentTask && !parentTask.completed) {
            const remainingSubTasks = currentTasks.filter(st => st.parentId === parentIdOfDeletedTask);
            if (remainingSubTasks.length === 0 || remainingSubTasks.every(st => st.completed)) {
              if (status === 'deleted' && numRemoved > 0) { 
                 const updatedParent = { ...parentTask, completed: true, applicants: parentTask.applicants || [] };
                 if (typeof updatedParent.order === 'undefined' && !updatedParent.parentId) {
                   updatedParent.order = tasks.filter(t => !t.parentId).length;
                 }
                 updateTaskMutation.mutate(updatedParent);
              } else if (remainingSubTasks.length === 0 || remainingSubTasks.every(st => st.completed)) {
                 const updatedParent = { ...parentTask, completed: true, applicants: parentTask.applicants || [] };
                  if (typeof updatedParent.order === 'undefined' && !updatedParent.parentId) {
                   updatedParent.order = tasks.filter(t => !t.parentId).length;
                 }
                 updateTaskMutation.mutate(updatedParent);
              }
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
    const mainTasks = tasks.filter(t => !t.parentId);
    const taskWithDefaults = {
      ...newTask,
      order: newTask.parentId ? undefined : mainTasks.length, 
      applicants: newTask.applicants || [], 
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
    // Ensure 'order' is not undefined for main tasks being updated
    const taskToUpdate = { ...updatedTask };
    if (typeof taskToUpdate.order === 'undefined' && !taskToUpdate.parentId) {
      // Try to find its existing order or default to end of list
      const existingTask = tasks.find(t => t.id === taskToUpdate.id);
      taskToUpdate.order = existingTask?.order ?? tasks.filter(t => !t.parentId).length;
    }


    updateTaskMutation.mutate(taskToUpdate, {
      onSuccess: () => {
        let toastDescription = `"${taskToUpdate.title}" has been saved.`;
        if (newSubTasksToCreate && newSubTasksToCreate.length > 0) {
          newSubTasksToCreate.forEach(subTask => {
            const subTaskWithParent = {
              ...subTask,
              parentId: taskToUpdate.id,
              order: undefined, 
              applicants: [], 
            };
            addTaskMutation.mutate(subTaskWithParent);
          });
          toastDescription += ` ${newSubTasksToCreate.length} new sub-task${newSubTasksToCreate.length > 1 ? 's were' : ' was'} added.`;
          
          if (taskToUpdate.completed && !taskToUpdate.parentId) {
             const hasIncompleteNewSubtasks = newSubTasksToCreate.some(st => !st.completed);
             if (hasIncompleteNewSubtasks) {
                const reIncompleteParent = {...taskToUpdate, completed: false, applicants: taskToUpdate.applicants || []};
                if (typeof reIncompleteParent.order === 'undefined' && !reIncompleteParent.parentId) {
                  reIncompleteParent.order = tasks.filter(t => !t.parentId).length;
                }
                updateTaskMutation.mutate(reIncompleteParent);
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
    let taskWithUpdate = { ...taskToToggle, completed: newCompletedStatus, applicants: taskToToggle.applicants || [] };
    
    // Ensure order is defined for main tasks
    if (typeof taskWithUpdate.order === 'undefined' && !taskWithUpdate.parentId) {
        taskWithUpdate.order = tasks.filter(t => !t.parentId).length;
    }


    if (!taskToToggle.parentId) { 
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
      updateTaskMutation.mutate(taskWithUpdate);
    } else { 
      updateTaskMutation.mutate(taskWithUpdate, {
        onSuccess: () => {
          const parentId = taskToToggle.parentId;
          if (parentId) {
            queryClient.refetchQueries({queryKey: ['tasks']}).then(() => {
              const currentTasks = queryClient.getQueryData<Task[]>(['tasks']) ?? [];
              const parentTask = currentTasks.find(t => t.id === parentId);
              if (parentTask) {
                const siblingSubTasks = currentTasks.filter(t => t.parentId === parentId);
                const allSubTasksNowComplete = siblingSubTasks.every(st => st.completed);
                
                let parentToUpdate = {...parentTask, applicants: parentTask.applicants || []};
                 if (typeof parentToUpdate.order === 'undefined' && !parentToUpdate.parentId) {
                    parentToUpdate.order = tasks.filter(t => !t.parentId).length;
                 }


                if (allSubTasksNowComplete) {
                  if (!parentTask.completed) {
                    updateTaskMutation.mutate({ ...parentToUpdate, completed: true });
                  }
                } else { 
                  if (parentTask.completed) {
                    updateTaskMutation.mutate({ ...parentToUpdate, completed: false });
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

