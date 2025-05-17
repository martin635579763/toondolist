
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

interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
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
          localStorage.removeItem('toondoTasks'); // Clear if not an array
        }
      } catch (e) {
        console.error("Failed to parse tasks from localStorage", e);
        localStorage.removeItem('toondoTasks'); // Clear on error
      }
    }
  }, []);

  useEffect(() => {
    // Only save to localStorage if tasks is not empty,
    // or if it was non-empty before (to allow clearing all tasks)
    if (typeof window !== 'undefined') {
      if (tasks.length > 0 || localStorage.getItem('toondoTasks') !== null) {
         localStorage.setItem('toondoTasks', JSON.stringify(tasks));
      }
    }
  }, [tasks]);

  const handleAddTask = (newTask: Task) => {
    setTasks(prevTasks => [...prevTasks, newTask]);
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

    setTasks(prevTasks => {
      let newTasks = prevTasks.map(task =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task
      );
      mainTaskUpdated = true;

      if (newSubTasksToCreate && newSubTasksToCreate.length > 0) {
        newTasks = [...newTasks, ...newSubTasksToCreate];
        subTasksAddedCount = newSubTasksToCreate.length;
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
    handleCloseEditDialog();
  };

  const handleToggleComplete = (id: string) => {
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;

    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    let numRemoved = 0;
    const tasksToRemoveBasedOnCurrentState = new Set<string>([id]);
    if (!taskToDelete.parentId) { // If it's a main task, also mark its children for removal
      tasks.forEach(t => {
        if (t.parentId === id) {
          tasksToRemoveBasedOnCurrentState.add(t.id);
        }
      });
    }
    numRemoved = tasksToRemoveBasedOnCurrentState.size;
    
    setTasks(prevTasks => {
       // Re-calculate tasks to remove based on the prevTasks state inside updater to avoid race conditions
       const finalTasksToRemove = new Set<string>([id]);
       const taskToDeleteInUpdater = prevTasks.find(t => t.id === id);
        if (taskToDeleteInUpdater && !taskToDeleteInUpdater.parentId) { // If it's a main task
            prevTasks.forEach(pt => {
                if (pt.parentId === id) {
                    finalTasksToRemove.add(pt.id);
                }
            });
        }
      return prevTasks.filter(task => !finalTasksToRemove.has(task.id));
    });
    
    toast({
      title: "ToonDo Removed!",
      description: `Task "${taskToDelete.title}" ${numRemoved > 1 ? 'and its sub-tasks were' : 'was'} removed.`,
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
       // Ensure it's hidden again after print dialog might close
       printableAreaRef.current.classList.add('hidden');
       printableAreaRef.current.classList.remove('print:block');
    }
  }, []);

  const handleInitiatePrint = (task: Task) => {
    setTaskToPrint(task);
  };
  
  // Effect to trigger actual print after state is set
  useEffect(() => {
    if (taskToPrint) {
      // Timeout helps ensure the DOM is updated before printing
      const timer = setTimeout(() => {
        actualPrint();
        setTaskToPrint(null); // Reset after initiating print
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [taskToPrint, actualPrint]);

  // Cleanup after print
  useEffect(() => {
    const afterPrintHandler = () => {
      if (printableAreaRef.current) {
        printableAreaRef.current.classList.add('hidden');
        printableAreaRef.current.classList.remove('print:block');
      }
      setTaskToPrint(null); // Ensure reset if print was cancelled or finished
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
    // Only clear if leaving a different item than the one being dragged over,
    // or if the drag target is not the dragged item itself.
    // This handles nested drags a bit better.
    setDragOverItemId(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (droppedOnMainTaskId: string) => {
    if (!draggedItemId || draggedItemId === droppedOnMainTaskId || !droppedOnMainTaskId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    setTasks(prevTasks => {
      // Create a list of main tasks in their current order
      const allMainTasksOriginal = prevTasks.filter(task => !task.parentId);
      const mainTaskIds = allMainTasksOriginal.map(t => t.id);

      const draggedIdx = mainTaskIds.indexOf(draggedItemId);
      let targetIdx = mainTaskIds.indexOf(droppedOnMainTaskId);

      if (draggedIdx === -1 || targetIdx === -1) {
        // Should not happen if logic is correct, but a good safeguard
        return prevTasks; 
      }

      // Reorder main task IDs
      mainTaskIds.splice(draggedIdx, 1); // Remove dragged item
      mainTaskIds.splice(targetIdx, 0, draggedItemId); // Insert at new position

      // Reconstruct the full tasks array based on the new order of main tasks
      const newFullTasksArray: Task[] = [];
      mainTaskIds.forEach(id => {
        const mainTask = prevTasks.find(t => t.id === id && !t.parentId);
        if (mainTask) {
          newFullTasksArray.push(mainTask);
          // Add its sub-tasks, maintaining their original relative order (by createdAt)
          const subTasksOfThisParent = prevTasks.filter(st => st.parentId === id)
                                    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
          newFullTasksArray.push(...subTasksOfThisParent);
        }
      });
      
      // Ensure any tasks not processed (e.g., orphaned subtasks, though ideally none) are appended
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
    // Reset drag states
    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  // Prepare tasks for display (grouping main tasks with their sub-tasks)
  const taskGroups: TaskGroup[] = [];
  if (tasks.length > 0) {
    // Sort all tasks: main tasks first (by their current order in `tasks` array), then sub-tasks by creation time.
    // This relies on the `tasks` array itself being the source of truth for main task order.
    const sortedInitialTasks = [...tasks].sort((a, b) => {
      // If 'a' is a main task and 'b' is a sub-task, 'a' comes first
      if (!a.parentId && b.parentId) return -1;
      // If 'b' is a main task and 'a' is a sub-task, 'b' comes first
      if (a.parentId && !b.parentId) return 1;
      // If both are sub-tasks, sort by parent ID first, then by creation time
      if (a.parentId && b.parentId) {
        if (a.parentId !== b.parentId) {
          // Find order of their parents
          const parentAOrder = tasks.findIndex(t => t.id === a.parentId && !t.parentId);
          const parentBOrder = tasks.findIndex(t => t.id === b.parentId && !t.parentId);
          return parentAOrder - parentBOrder;
        }
        return (a.createdAt || 0) - (b.createdAt || 0); // Sort sub-tasks by creation time
      }
      // If both are main tasks, maintain their order from the `tasks` array
      const indexA = tasks.findIndex(t => t.id === a.id);
      const indexB = tasks.findIndex(t => t.id === b.id);
      return indexA - indexB;
    });

    const mainDisplayTasks = sortedInitialTasks.filter(task => !task.parentId);
    
    mainDisplayTasks.forEach(pt => {
      const group: TaskGroup = {
        mainTask: pt,
        subTasks: sortedInitialTasks.filter(st => st.parentId === pt.id)
                      .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0)) // ensure sub-tasks are ordered
      };
      taskGroups.push(group);
    });
  }

  return (
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
            // 'items-start' ensures cards don't stretch to fill row height
          )}
        >
          {taskGroups.map(({ mainTask, subTasks }) => (
            <div
              key={mainTask.id}
              className="flex flex-col gap-2" // Stack main task and its sub-tasks vertically
              draggable={true}
              onDragStart={(e) => { e.stopPropagation(); handleDragStart(mainTask.id);}}
              onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(mainTask.id);}}
              onDragLeave={(e) => { e.stopPropagation(); handleDragLeave();}}
              onDrop={(e) => { e.stopPropagation(); handleDrop(mainTask.id);}}
              onDragOver={(e) => { e.stopPropagation(); handleDragOver(e);}} // Needs stopPropagation if nested
              onDragEnd={(e) => { e.stopPropagation(); handleDragEnd();}}
            >
              <TaskCard
                task={mainTask}
                allTasks={tasks} // Pass all tasks for context
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
                onPrint={handleInitiatePrint}
                onEdit={handleOpenEditDialog}
                isDraggingSelf={draggedItemId === mainTask.id}
                isDragOverSelf={dragOverItemId === mainTask.id && draggedItemId !== mainTask.id}
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
                  isDraggingSelf={false} // Sub-tasks themselves are not directly dragged in this model
                  isDragOverSelf={false} // Sub-tasks are not direct drop targets in this model
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
  );
}

    