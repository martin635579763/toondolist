
"use client";

import type { ReactNode} from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task } from '@/types/task';
import { CreateTaskForm } from '@/components/toondo/CreateTaskForm';
import { EditTaskDialog } from '@/components/toondo/EditTaskDialog';
import { TaskCard } from '@/components/toondo/TaskCard';
import { PrintableTaskCard } from '@/components/toondo/PrintableTaskCard';
import { FileTextIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
  mainTaskHasIncompleteSubtasks: boolean;
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);
  const { toast } = useToast();
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const savedTasks = localStorage.getItem('toondoTasks');
    if (savedTasks) {
      try {
        const parsedTasks: Task[] = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks);
        } else {
          localStorage.removeItem('toondoTasks');
        }
      } catch (e) {
        console.error("Failed to parse tasks from localStorage", e);
        localStorage.removeItem('toondoTasks');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (tasks.length > 0 || localStorage.getItem('toondoTasks') !== null) {
         localStorage.setItem('toondoTasks', JSON.stringify(tasks));
      }
    }
  }, [tasks]);

  const handleAddTask = (newTask: Task) => {
    setTasks(prevTasks => {
        let newTasksList = [...prevTasks, newTask];
        if (newTask.parentId) { 
            const parentIndex = newTasksList.findIndex(t => t.id === newTask.parentId);
            if (parentIndex !== -1 && newTasksList[parentIndex].completed) {
                newTasksList[parentIndex] = { ...newTasksList[parentIndex], completed: false };
                // No separate toast needed here, the main add toast is sufficient
                 toast({
                    title: "Parent Task Updated",
                    description: `"${newTasksList[parentIndex].title}" marked incomplete as a new sub-task was added.`,
                });
            }
        }
        return newTasksList;
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
    let mainTaskUpdated = false;
    let subTasksAddedCount = 0;
    let parentTaskAffectedByNewSubtasks = false;
    let affectedParentTitle = "";

    setTasks(prevTasks => {
      let newTasks = prevTasks.map(task =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      );
      mainTaskUpdated = true;

      if (newSubTasksToCreate && newSubTasksToCreate.length > 0) {
        newTasks = [...newTasks, ...newSubTasksToCreate];
        subTasksAddedCount = newSubTasksToCreate.length;

        // If new sub-tasks were added to a completed main task, mark it incomplete
        const parentIndex = newTasks.findIndex(t => t.id === updatedTask.id);
        if (parentIndex !== -1 && newTasks[parentIndex].completed) {
          newTasks[parentIndex] = { ...newTasks[parentIndex], completed: false };
          parentTaskAffectedByNewSubtasks = true;
          affectedParentTitle = newTasks[parentIndex].title;
        }
      }
      return newTasks;
    });
    
    let toastDescription = `"${updatedTask.title}" has been saved.`;
    if (subTasksAddedCount > 0) {
      toastDescription += ` ${subTasksAddedCount} new sub-task${subTasksAddedCount > 1 ? 's were' : ' was'} added.`;
    }
    if (parentTaskAffectedByNewSubtasks) {
        toastDescription += ` Parent task "${affectedParentTitle}" was marked incomplete.`;
    }


    if (mainTaskUpdated || subTasksAddedCount > 0) {
      toast({
        title: "ToonDo Updated!",
        description: toastDescription,
      });
    }
    handleCloseEditDialog();
  };

  const handleToggleComplete = (id: string) => {
    setTasks(prevTasks => {
        const taskToToggle = prevTasks.find(t => t.id === id);
        if (!taskToToggle) return prevTasks;

        let newTasksState = [...prevTasks];
        const taskIndex = newTasksState.findIndex(t => t.id === id);

        // Logic for MAIN TASKS
        if (!taskToToggle.parentId) {
            const subTasks = newTasksState.filter(t => t.parentId === id);
            const hasIncompleteSubtasks = subTasks.some(st => !st.completed);

            // Trying to mark a main task complete
            if (!taskToToggle.completed && hasIncompleteSubtasks) {
                toast({
                    title: "Still have work to do!",
                    description: `"${taskToToggle.title}" cannot be completed until all its sub-tasks are done.`,
                    variant: "default",
                });
                return prevTasks; // Prevent completion
            }
            // If here, main task can be toggled
            if (taskIndex !== -1) {
                newTasksState[taskIndex] = { ...newTasksState[taskIndex], completed: !taskToToggle.completed };
            }
        }
        // Logic for SUB-TASKS
        else {
            if (taskIndex !== -1) {
                newTasksState[taskIndex] = { ...newTasksState[taskIndex], completed: !taskToToggle.completed };

                const parentId = newTasksState[taskIndex].parentId;
                if (parentId) {
                    const parentTaskIndex = newTasksState.findIndex(t => t.id === parentId);
                    if (parentTaskIndex !== -1) {
                        const siblingSubTasks = newTasksState.filter(t => t.parentId === parentId);
                        const allSubTasksNowComplete = siblingSubTasks.every(st => st.completed);
                        const parentTask = newTasksState[parentTaskIndex];

                        if (allSubTasksNowComplete) {
                            if (!parentTask.completed) {
                                newTasksState[parentTaskIndex] = { ...parentTask, completed: true };
                                toast({ title: "Way to go!", description: `Main task "${parentTask.title}" auto-completed!` });
                            }
                        } else {
                            if (parentTask.completed) {
                                newTasksState[parentTaskIndex] = { ...parentTask, completed: false };
                                toast({ title: "Heads up!", description: `Main task "${parentTask.title}" marked incomplete as a sub-task was updated.` });
                            }
                        }
                    }
                }
            }
        }
        return newTasksState;
    });
};


  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    let numRemoved = 0;
    let toastMessage = "";

    setTasks(prevTasks => {
        const tasksToRemoveBasedOnCurrentState = new Set<string>([id]);
        if (!taskToDelete.parentId) {
            prevTasks.forEach(t => {
                if (t.parentId === id) {
                    tasksToRemoveBasedOnCurrentState.add(t.id);
                }
            });
        }
        numRemoved = tasksToRemoveBasedOnCurrentState.size;
        
        let remainingTasks = prevTasks.filter(task => !tasksToRemoveBasedOnCurrentState.has(task.id));
        
        // Check parent completion if a sub-task was deleted
        if (taskToDelete.parentId) {
            const parentId = taskToDelete.parentId;
            const parentTaskIndex = remainingTasks.findIndex(t => t.id === parentId);
            if (parentTaskIndex !== -1) {
                const parentTask = remainingTasks[parentTaskIndex];
                const siblingSubTasks = remainingTasks.filter(t => t.parentId === parentId);
                const allRemainingSubTasksComplete = siblingSubTasks.length === 0 || siblingSubTasks.every(st => st.completed);

                if (allRemainingSubTasksComplete && !parentTask.completed) {
                    remainingTasks[parentTaskIndex] = { ...parentTask, completed: true };
                    toastMessage = `Main task "${parentTask.title}" auto-completed.`;
                }
            }
        }
        return remainingTasks;
    });
    
    toast({
      title: "ToonDo Removed!",
      description: `Task "${taskToDelete.title}" ${numRemoved > 1 ? 'and its sub-tasks were' : 'was'} removed. ${toastMessage}`,
      variant: "destructive"
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
      const allMainTasksOriginal = prevTasks.filter(task => !task.parentId);
      const mainTaskIds = allMainTasksOriginal.map(t => t.id);

      const draggedIdx = mainTaskIds.indexOf(draggedItemId);
      let targetIdx = mainTaskIds.indexOf(droppedOnMainTaskId);

      if (draggedIdx === -1 || targetIdx === -1) {
        return prevTasks; 
      }

      mainTaskIds.splice(draggedIdx, 1); 
      mainTaskIds.splice(targetIdx, 0, draggedItemId); 

      const newFullTasksArray: Task[] = [];
      mainTaskIds.forEach(id => {
        const mainTask = prevTasks.find(t => t.id === id && !t.parentId);
        if (mainTask) {
          newFullTasksArray.push(mainTask);
          const subTasksOfThisParent = prevTasks.filter(st => st.parentId === id)
                                    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          newFullTasksArray.push(...subTasksOfThisParent);
        }
      });
      
      const processedIds = new Set(newFullTasksArray.map(t => t.id));
      prevTasks.forEach(t => {
        if (!processedIds.has(t.id)) {
          newFullTasksArray.push(t);
        }
      });

      return newFullTasksArray;
    });

    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const taskGroups: TaskGroup[] = [];
  if (tasks.length > 0) {
    const sortedInitialTasks = [...tasks].sort((a, b) => {
      if (!a.parentId && b.parentId) return -1;
      if (a.parentId && !b.parentId) return 1;
      if (a.parentId && b.parentId) {
        if (a.parentId !== b.parentId) {
          const parentAOrder = tasks.findIndex(t => t.id === a.parentId && !t.parentId);
          const parentBOrder = tasks.findIndex(t => t.id === b.parentId && !t.parentId);
          return parentAOrder - parentBOrder;
        }
        return (a.createdAt || 0) - (b.createdAt || 0); 
      }
      const indexA = tasks.findIndex(t => t.id === a.id);
      const indexB = tasks.findIndex(t => t.id === b.id);
      return indexA - indexB;
    });

    const mainDisplayTasks = sortedInitialTasks.filter(task => !task.parentId);
    
    mainDisplayTasks.forEach(pt => {
      const subTasksForThisParent = sortedInitialTasks.filter(st => st.parentId === pt.id)
                                      .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));
      const group: TaskGroup = {
        mainTask: pt,
        subTasks: subTasksForThisParent,
        mainTaskHasIncompleteSubtasks: subTasksForThisParent.some(st => !st.completed)
      };
      taskGroups.push(group);
    });
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
      
      {tasks.length === 0 ? (
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
                  isMainTaskWithIncompleteSubtasks={false} // Subtasks don't have this specific restriction
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
