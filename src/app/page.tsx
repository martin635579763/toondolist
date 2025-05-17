
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
  const { toast, dismiss } = useToast();
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
    let affectedParentTitleForToast = "";
    setTasks(prevTasks => {
        let newTasksList = [...prevTasks, newTask];
        if (newTask.parentId) { 
            const parentIndex = newTasksList.findIndex(t => t.id === newTask.parentId);
            if (parentIndex !== -1 && newTasksList[parentIndex].completed) {
                newTasksList[parentIndex] = { ...newTasksList[parentIndex], completed: false };
                affectedParentTitleForToast = newTasksList[parentIndex].title;
            }
        }
        return newTasksList;
    });
    toast({
      title: "ToonDo Added!",
      description: `"${newTask.title}" is ready ${newTask.parentId ? 'as a sub-task!' : 'to be tackled!'}`,
    });
    if (affectedParentTitleForToast) {
        toast({
            title: "Parent Task Updated",
            description: `"${affectedParentTitleForToast}" marked incomplete as a new sub-task was added.`,
        });
    }
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

        // The parent is the updatedTask itself, since we are editing it and adding sub-tasks to it.
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
    
    if (mainTaskUpdated || subTasksAddedCount > 0) {
      toast({
        title: "ToonDo Updated!",
        description: toastDescription,
      });
    }
     if (parentTaskAffectedByNewSubtasks) {
        toast({
            title: "Parent Task Updated",
            description: `Parent task "${affectedParentTitle}" was marked incomplete due to new sub-tasks.`,
        });
    }
    handleCloseEditDialog();
  };

  const handleToggleComplete = (id: string) => {
    let parentMarkedIncompleteTitle = "";
    let taskThatTriggeredParentChange: Task | null = null;
    // let mainTaskJustCompleted = false; // For fireworks, not toast
    // let mainTaskTitleForCompletion = ""; // For fireworks, not toast


    setTasks(prevTasks => {
        const taskToToggle = prevTasks.find(t => t.id === id);
        if (!taskToToggle) return prevTasks;

        let newTasksState = [...prevTasks];
        const taskIndex = newTasksState.findIndex(t => t.id === id);

        if (!taskToToggle.parentId) { // MAIN TASK
            const subTasks = newTasksState.filter(t => t.parentId === id);
            const hasIncompleteSubtasks = subTasks.some(st => !st.completed);

            if (!taskToToggle.completed && hasIncompleteSubtasks) { // Trying to complete main task with incomplete sub-tasks
                taskThatTriggeredParentChange = taskToToggle; 
                return prevTasks; 
            }
            // Allowed to toggle (either completing a main task with all sub-tasks done, or marking a main task incomplete)
            if (taskIndex !== -1) {
                newTasksState[taskIndex] = { ...newTasksState[taskIndex], completed: !taskToToggle.completed };
                // if(newTasksState[taskIndex].completed){ 
                //     mainTaskJustCompleted = true;
                //     mainTaskTitleForCompletion = newTasksState[taskIndex].title;
                // }
            }
        } else { // SUB-TASK
            if (taskIndex !== -1) {
                newTasksState[taskIndex] = { ...newTasksState[taskIndex], completed: !taskToToggle.completed };
                const parentId = newTasksState[taskIndex].parentId;
                if (parentId) {
                    const parentTaskIndex = newTasksState.findIndex(t => t.id === parentId);
                    if (parentTaskIndex !== -1) {
                        const parentTask = newTasksState[parentTaskIndex];
                        const siblingSubTasks = newTasksState.filter(t => t.parentId === parentId);
                        const allSubTasksNowComplete = siblingSubTasks.every(st => st.completed);

                        if (allSubTasksNowComplete) {
                            if (!parentTask.completed) { // Parent wasn't complete, now it is (auto-complete)
                                newTasksState[parentTaskIndex] = { ...parentTask, completed: true };
                                // if(newTasksState[parentTaskIndex].completed){ 
                                //     mainTaskJustCompleted = true;
                                //     mainTaskTitleForCompletion = newTasksState[parentTaskIndex].title;
                                // }
                            }
                        } else { // Not all sub-tasks are complete
                            if (parentTask.completed) { // Parent was complete, now it's not (auto-incomplete)
                                newTasksState[parentTaskIndex] = { ...parentTask, completed: false };
                                parentMarkedIncompleteTitle = parentTask.title;
                            }
                        }
                    }
                }
            }
        }
        return newTasksState;
    });

    // Toasts after state update attempt
    if (taskThatTriggeredParentChange) {
         toast({
            title: "Still have work to do!",
            description: `"${taskThatTriggeredParentChange.title}" cannot be completed until all its sub-tasks are done.`,
            variant: "default",
        });
    }
    if (parentMarkedIncompleteTitle) {
        toast({ title: "Heads up!", description: `Main task "${parentMarkedIncompleteTitle}" marked incomplete as a sub-task was updated.` });
    }
    // Main task completion toast is handled by fireworks or intentionally suppressed
};


  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    let numRemoved = 0;
    // let toastMessageForParentCompletion = ""; // Removed: We don't want to toast main task completion
    let removedTaskTitle = taskToDelete.title;
    // let mainTaskJustCompletedAfterDelete = false; // For fireworks, not toast
    // let completedParentTitle = ""; // For fireworks, not toast


    setTasks(prevTasks => {
        const tasksToRemoveBasedOnCurrentState = new Set<string>([id]);
        if (!taskToDelete.parentId) { // If it's a main task, also remove its sub-tasks
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

                if (allRemainingSubTasksComplete && !parentTask.completed) { // Parent auto-completes
                    remainingTasks[parentTaskIndex] = { ...parentTask, completed: true };
                    // mainTaskJustCompletedAfterDelete = true; // For fireworks
                    // completedParentTitle = remainingTasks[parentTaskIndex].title; // For fireworks
                    // toastMessageForParentCompletion = `Main task "${parentTask.title}" auto-completed.`; // No longer used for toast
                }
            }
        }
        return remainingTasks;
    });
    
    const fullToastDescription = `Task "${removedTaskTitle}" ${numRemoved > 1 ? 'and its sub-tasks were' : 'was'} removed.`;
    // The part that appended toastMessageForParentCompletion has been removed.

    toast({
      title: "ToonDo Removed!",
      description: fullToastDescription,
      variant: "destructive"
    });

    // Main task completion toast is handled by fireworks or intentionally suppressed
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

      // Reorder mainTaskIds
      const itemToMove = mainTaskIds.splice(draggedIdx, 1)[0];
      mainTaskIds.splice(targetIdx, 0, itemToMove);

      // Reconstruct the full tasks array based on the new order of main tasks
      const newFullTasksArray: Task[] = [];
      const processedIds = new Set<string>();

      mainTaskIds.forEach(id => {
        const mainTask = prevTasks.find(t => t.id === id && !t.parentId);
        if (mainTask) {
          newFullTasksArray.push(mainTask);
          processedIds.add(mainTask.id);
          const subTasksOfThisParent = prevTasks
            .filter(st => st.parentId === id)
            .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // Keep sub-task order
          subTasksOfThisParent.forEach(st => {
            newFullTasksArray.push(st);
            processedIds.add(st.id);
          });
        }
      });
      
      // Add any tasks not part of the reordered main task groups (should be none if logic is correct)
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
    // Create a map for quick lookup of main task order
    const mainTaskOrderMap = new Map<string, number>();
    tasks.filter(task => !task.parentId).forEach((task, index) => {
        mainTaskOrderMap.set(task.id, index);
    });
    
    const mainDisplayTasks = tasks.filter(task => !task.parentId)
     .sort((a,b) => (mainTaskOrderMap.get(a.id) ?? Infinity) - (mainTaskOrderMap.get(b.id) ?? Infinity)); // Ensure main tasks follow the array order
    
    mainDisplayTasks.forEach(pt => {
      const subTasksForThisParent = tasks.filter(st => st.parentId === pt.id)
                                      .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0)); // Sub-tasks sorted by creation time
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

