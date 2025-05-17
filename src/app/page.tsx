
"use client";

import type { ReactNode} from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task } from '@/types/task';
import { CreateTaskForm } from '@/components/toondo/CreateTaskForm';
import { TaskCard } from '@/components/toondo/TaskCard';
import { PrintableTaskCard } from '@/components/toondo/PrintableTaskCard';
// import { Button } from '@/components/ui/button'; // Removed as layout toggle is removed
import { FileTextIcon } from 'lucide-react'; // LayoutGridIcon, ListIcon removed
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

// type LayoutMode = "grid" | "list"; // Removed

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);
  // const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid"); // Removed
  const { toast } = useToast();
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);


  useEffect(() => {
    const savedTasks = localStorage.getItem('toondoTasks');
    if (savedTasks) {
      try {
        const parsedTasks: Task[] = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks); // Keep original sort order from localStorage for DnD
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
    let newTasksList: Task[];
    setTasks(prevTasks => {
      newTasksList = [...prevTasks, newTask];
      // No explicit sort here to preserve DnD order; sorting is for display
      return newTasksList;
    });
    toast({
      title: "ToonDo Added!",
      description: `"${newTask.title}" is ready ${newTask.parentId ? 'as a sub-task!' : 'to be tackled!'}`,
    });
  };

  const handleToggleComplete = (id: string) => {
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
    if (!taskToDelete.parentId) { // If it's a parent task
      tasks.forEach(t => {
        if (t.parentId === id) { // Add all its children
          tasksToRemoveBasedOnCurrentState.add(t.id);
        }
      });
    }
    numRemoved = tasksToRemoveBasedOnCurrentState.size;
    
    setTasks(prevTasks => {
       const finalTasksToRemove = new Set<string>([id]);
       const taskToDeleteInUpdater = prevTasks.find(t => t.id === id);
        if (taskToDeleteInUpdater && !taskToDeleteInUpdater.parentId) {
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


  // Drag and Drop Handlers
  const handleDragStart = (id: string) => {
    setDraggedItemId(id);
  };

  const handleDragEnter = (id: string) => {
    if (id !== draggedItemId) {
      setDragOverItemId(id);
    }
  };
  
  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (droppedOnItemId: string) => {
    if (!draggedItemId || draggedItemId === droppedOnItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    setTasks(prevTasks => {
      const draggedItemIndex = prevTasks.findIndex(task => task.id === draggedItemId);
      const droppedOnItemIndex = prevTasks.findIndex(task => task.id === droppedOnItemId);

      if (draggedItemIndex === -1 || droppedOnItemIndex === -1) return prevTasks;

      const newTasks = [...prevTasks];
      const [draggedItem] = newTasks.splice(draggedItemIndex, 1);
      
      // Adjust index if dragging downwards
      const insertAtIndex = draggedItemIndex < droppedOnItemIndex ? droppedOnItemIndex : droppedOnItemIndex;
      
      newTasks.splice(insertAtIndex, 0, draggedItem);
      return newTasks;
    });

    setDraggedItemId(null);
    setDragOverItemId(null);
  };
  
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  // Sorting logic for display - attempts to keep sub-tasks with parents
  // Main tasks are sorted by completion then creation date (reversed)
  // Sub-tasks are sorted by creation date within their parent context
  const sortedTasks = [...tasks].sort((a, b) => {
    // Group sub-tasks under their parents
    if (a.parentId && b.parentId) { // Both are sub-tasks
      if (a.parentId === b.parentId) { // Sub-tasks of the same parent
        return (a.createdAt || 0) - (b.createdAt || 0); // Sort by creation
      }
      // Sub-tasks of different parents, sort by their parent's order (implicitly handled by parent sort)
    }
    if (a.parentId && !b.parentId) return 1; // a is sub, b is main, b comes first
    if (!a.parentId && b.parentId) return -1; // a is main, b is sub, a comes first

    // For main tasks (or if parent sorting doesn't differentiate)
    if (a.completed === b.completed) {
      // Original order (which is DnD influenced) is primary sort for items of same completion status
      // The tasks array itself now reflects the drag-and-drop order.
      // We don't need an explicit secondary sort by createdAt here if DnD is primary.
      // Fallback to creation for newly added items if no DnD has occurred for them yet.
      const indexA = tasks.findIndex(t => t.id === a.id);
      const indexB = tasks.findIndex(t => t.id === b.id);
      return indexA - indexB;
    }
    return a.completed ? 1 : -1; // Incomplete tasks first
  });
  
  // Filter for display: only show top-level tasks or sub-tasks whose parent is visible in the current filtered/sorted list
  const displayTasks = sortedTasks.filter(task => {
    if (!task.parentId) return true; // Always show main tasks
    // Show sub-task only if its parent is in the sortedTasks list (which means it's not filtered out)
    return sortedTasks.some(parent => parent.id === task.parentId && !parent.completed);
  });


  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <header className="text-center mb-10">
        <h1 className="text-6xl font-bold text-primary" style={{ fontFamily: 'var(--font-comic-neue), cursive' }}>
          ToonDo List
        </h1>
        <p className="text-muted-foreground text-lg mt-2">Your fun &amp; colorful task manager!</p>
      </header>

      <CreateTaskForm onAddTask={handleAddTask} />

      {/* Removed Layout Toggle Buttons */}
      
      {tasks.length === 0 ? (
         <div className="text-center py-16">
          <FileTextIcon className="mx-auto h-24 w-24 text-muted-foreground opacity-50 mb-4" />
          <h2 className="text-3xl font-semibold mb-2">No ToonDos Yet!</h2>
          <p className="text-muted-foreground text-lg">Time to add some fun tasks to your list.</p>
        </div>
      ) : (
        <div
          className={cn(
            // Always use grid layout
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
          )}
          onDragOver={handleDragOver} // Allow dropping onto the container (optional, for edge cases)
        >
          {displayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              allTasks={tasks} 
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onPrint={handleInitiatePrint}
              // Drag and Drop props
              onDragStart={() => handleDragStart(task.id)}
              onDragEnter={() => handleDragEnter(task.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(task.id)}
              onDragOverCard={handleDragOver} // Pass the general drag over for the card itself
              onDragEnd={handleDragEnd}
              isDraggingSelf={draggedItemId === task.id}
              isDragOverSelf={dragOverItemId === task.id && draggedItemId !== task.id}
            />
          ))}
        </div>
      )}
      
      <div id="printable-area" ref={printableAreaRef} className="hidden">
        {taskToPrint && <PrintableTaskCard task={taskToPrint} />}
      </div>

      <footer className="text-center mt-16 py-8 border-t border-border">
        <p className="text-muted-foreground">
          &copy; {new Date().getFullYear()} ToonDo List. Make your tasks fun!
        </p>
      </footer>
    </div>
  );
}
