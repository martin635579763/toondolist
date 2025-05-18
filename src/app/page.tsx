
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
import { cn, generateId } from '@/lib/utils';
import {
  Tooltip,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TaskSummarySidebar } from '@/components/toondo/TaskSummarySidebar';
import { Button } from '@/components/ui/button';


interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
  mainTaskHasIncompleteSubtasks: boolean;
}

function HomePageContent() {
  const { toast, dismiss } = useToast();
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Load tasks from localStorage on initial render
  useEffect(() => {
    const storedTasks = localStorage.getItem('toondo-tasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks) as Task[];
        // Ensure all tasks have an applicants array and order
        const tasksWithDefaults = parsedTasks.map((task, index) => ({
          ...task,
          applicants: task.applicants || [],
          order: task.order ?? (task.parentId ? undefined : index) // Simple order for existing tasks
        }));
        setTasks(tasksWithDefaults);
      } catch (error) {
        console.error("Error parsing tasks from localStorage:", error);
        setTasks([]); // Fallback to empty if parsing fails
      }
    }
    setIsLoadingTasks(false);
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    if (!isLoadingTasks) { // Only save if initial load is done
      localStorage.setItem('toondo-tasks', JSON.stringify(tasks));
    }
  }, [tasks, isLoadingTasks]);


  const handleAddTask = (newTask: Task) => {
    const mainTasks = tasks.filter(t => !t.parentId);
    const taskWithDefaults: Task = {
      ...newTask,
      id: newTask.id || generateId(),
      createdAt: newTask.createdAt || Date.now(),
      applicants: newTask.applicants || [],
      order: newTask.parentId ? undefined : mainTasks.length,
    };

    setTasks(prevTasks => {
      const updatedTasks = [...prevTasks, taskWithDefaults];
      if (newTask.parentId) {
        const parentTask = updatedTasks.find(t => t.id === newTask.parentId);
        if (parentTask && parentTask.completed) {
          return updatedTasks.map(t =>
            t.id === parentTask.id ? { ...t, completed: false } : t
          );
        }
      }
      return updatedTasks;
    });

    toast({
      title: "ToonDo Added!",
      description: `"${newTask.title}" is ready ${newTask.parentId ? 'as a sub-task!' : 'to be tackled!'}`,
    });
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
    let toastDescription = `"${updatedTask.title}" has been updated.`;

    setTasks(prevTasks => {
        let newTasksList = prevTasks.map(task =>
          task.id === updatedTask.id ? { ...task, ...updatedTask, applicants: updatedTask.applicants || [] } : task
        );

        if (newSubTasksToCreate && newSubTasksToCreate.length > 0) {
          const subTasksWithParent = newSubTasksToCreate.map((subTask, index) => ({
            ...subTask,
            id: subTask.id || generateId(),
            parentId: updatedTask.id,
            createdAt: Date.now() + index + 1,
            applicants: [],
            color: subTask.color || '#CCCCCC',
            order: undefined,
          }));
          newTasksList = [...newTasksList, ...subTasksWithParent];
          toastDescription += ` ${newSubTasksToCreate.length} new sub-task${newSubTasksToCreate.length > 1 ? 's were' : ' was'} added.`;

          if (updatedTask.completed && !updatedTask.parentId) {
            const hasIncompleteNewSubtasks = newSubTasksToCreate.some(st => !st.completed);
            if (hasIncompleteNewSubtasks) {
              newTasksList = newTasksList.map(t =>
                t.id === updatedTask.id ? { ...t, completed: false } : t
              );
            }
          }
        }
        return newTasksList;
    });
    
    toast({
      title: "ToonDo Updated!",
      description: toastDescription,
    });
    handleCloseEditDialog();
  };

  const handleToggleComplete = (id: string) => {
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;

    const newCompletedStatus = !taskToToggle.completed;

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
    }

    setTasks(prevTasks => {
      let newTasks = prevTasks.map(task =>
        task.id === id ? { ...task, completed: newCompletedStatus } : task
      );

      if (taskToToggle.parentId && newCompletedStatus) {
        const parentId = taskToToggle.parentId;
        const siblingSubTasks = newTasks.filter(t => t.parentId === parentId);
        const allSubTasksNowComplete = siblingSubTasks.every(st => st.completed);
        if (allSubTasksNowComplete) {
          newTasks = newTasks.map(t =>
            t.id === parentId ? { ...t, completed: true } : t
          );
        }
      } else if (taskToToggle.parentId && !newCompletedStatus) {
        const parentId = taskToToggle.parentId;
         newTasks = newTasks.map(t =>
            t.id === parentId ? { ...t, completed: false } : t
          );
      }
      return newTasks;
    });
  };
  
  const handleDeleteTask = (taskToDelete: Task) => {
    if (!taskToDelete || !taskToDelete.id) {
      toast({ title: "Error", description: "Task data is invalid for deletion.", variant: "destructive" });
      return;
    }

    let tasksToRemoveIds = [taskToDelete.id];
    let parentIdOfDeletedSubTask: string | undefined = undefined;
    let mainTaskTitleForToast = taskToDelete.title;

    if (!taskToDelete.parentId) { // Main task
      const subTasksOfDeletedMain = tasks.filter(t => t.parentId === taskToDelete.id).map(st => st.id);
      tasksToRemoveIds = [...tasksToRemoveIds, ...subTasksOfDeletedMain];
    } else { // Sub-task
      parentIdOfDeletedSubTask = taskToDelete.parentId;
      const parentTask = tasks.find(t => t.id === parentIdOfDeletedSubTask);
      if (parentTask) mainTaskTitleForToast = parentTask.title; // Use parent title for sub-task deletion toast context
    }

    setTasks(prevTasks => {
      let updatedTasks = prevTasks.filter(task => !tasksToRemoveIds.includes(task.id));
      if (parentIdOfDeletedSubTask) {
        const parentTask = updatedTasks.find(t => t.id === parentIdOfDeletedSubTask);
        if (parentTask && !parentTask.completed) {
          const remainingSubTasks = updatedTasks.filter(st => st.parentId === parentIdOfDeletedSubTask);
          if (remainingSubTasks.length === 0 || remainingSubTasks.every(st => st.completed)) {
            updatedTasks = updatedTasks.map(t => t.id === parentIdOfDeletedSubTask ? { ...t, completed: true } : t);
             // No toast here for auto-completion, fireworks handle main task completion
          }
        }
      }
      return updatedTasks;
    });
    
    toast({
      title: "ToonDo Removed!",
      description: `Task "${taskToDelete.title}" ${tasksToRemoveIds.length > 1 ? 'and its sub-tasks were' : 'was'} removed.`,
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

  const handleDrop = (droppedOnMainTaskId: string) => {
    if (!draggedItemId || draggedItemId === droppedOnMainTaskId || !droppedOnMainTaskId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    setTasks(prevTasks => {
      const allMainTasksOriginal = prevTasks
        .filter(task => !task.parentId)
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

      const mainTaskIds = allMainTasksOriginal.map(t => t.id);
      const draggedIdx = mainTaskIds.indexOf(draggedItemId);
      const targetIdx = mainTaskIds.indexOf(droppedOnMainTaskId);

      if (draggedIdx === -1 || targetIdx === -1) {
        console.error("Drag and drop error: task ID not found in main task list.");
        return prevTasks;
      }

      const itemToMove = mainTaskIds.splice(draggedIdx, 1)[0];
      mainTaskIds.splice(targetIdx, 0, itemToMove);

      const newTasks = [...prevTasks];
      mainTaskIds.forEach((id, index) => {
        const taskIndexInNewTasks = newTasks.findIndex(t => t.id === id && !t.parentId);
        if (taskIndexInNewTasks !== -1) {
          newTasks[taskIndexInNewTasks] = { ...newTasks[taskIndexInNewTasks], order: index };
        }
      });
      return newTasks.sort((a, b) => { 
        if (a.parentId && b.parentId && a.parentId === b.parentId) return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        if (a.parentId && !b.parentId) return a.parentId === b.id ? 1 : -1; 
        if (!a.parentId && b.parentId) return a.id === b.parentId ? -1 : 1;
        return (a.order ?? Infinity) - (b.order ?? Infinity) || (a.createdAt ?? 0) - (b.createdAt ?? 0);
      });
    });
    
    toast({ title: "Tasks Reordered!", description: "Your ToonDos have a new sequence."});
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

  return (
    <SidebarProvider>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <TaskSummarySidebar tasks={tasks} />
      </Sidebar>
      <SidebarInset>
        <TooltipProvider>
          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center">
                  <SidebarTrigger className="mr-3" /> {/* Combined trigger for mobile and desktop */}
                  <h1 className="text-3xl sm:text-4xl font-bold text-primary" style={{ fontFamily: 'var(--font-comic-neue), cursive' }}>
                    ToonDo List
                  </h1>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base hidden md:block">Your fun &amp; colorful task manager!</p>
              </div>
            </header>

            <main className="flex-grow container mx-auto px-4 py-8">
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
            </main> {/* End of main content area */}
            
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

            <footer className="text-center py-8 border-t border-border mt-auto">
              <p className="text-muted-foreground">
                &copy; {new Date().getFullYear()} ToonDo List. Make your tasks fun!
              </p>
            </footer>
          </div>
        </TooltipProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function HomePage() {
  return (
      <HomePageContent />
  );
}
