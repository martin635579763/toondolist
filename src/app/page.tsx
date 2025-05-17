
"use client";

import type { ReactNode} from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task } from '@/types/task';
import { CreateTaskForm } from '@/components/toondo/CreateTaskForm';
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

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null); // ID of the main task of the group being dragged
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null); // ID of the main task of the group being dragged over


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
    setTasks(prevTasks => [...prevTasks, newTask]);
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
    if (!taskToDelete.parentId) {
      tasks.forEach(t => {
        if (t.parentId === id) {
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


  // Drag and Drop Handlers for Task Groups (identified by main task ID)
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

      // Remove draggedItemId and insert it at targetIdx
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
      
      // Ensure all tasks are included (e.g., if any somehow became orphaned, though unlikely with this logic)
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
  
  // Prepare tasks for display: Group main tasks with their sub-tasks
  const taskGroups: TaskGroup[] = [];
  if (tasks.length > 0) {
    // First, sort tasks: main tasks by completion then user order, sub-tasks by creation under parent
    // This initial sort helps in organizing `displayTasks` which then feeds into `taskGroups`
    const sortedInitialTasks = [...tasks].sort((a, b) => {
      if (a.parentId && !b.parentId) return 1; // a is sub, b is main -> b first
      if (!a.parentId && b.parentId) return -1; // a is main, b is sub -> a first
      if (a.parentId && b.parentId) { // both are subs
        if (a.parentId === b.parentId) return (a.createdAt || 0) - (b.createdAt || 0); // same parent, sort by creation
        // subs of different parents, their order is dictated by their parents' order
        const parentAOrder = tasks.findIndex(t => t.id === a.parentId);
        const parentBOrder = tasks.findIndex(t => t.id === b.parentId);
        return parentAOrder - parentBOrder;
      }
      // both are main tasks
      if (a.completed === b.completed) {
        const indexA = tasks.findIndex(t => t.id === a.id); // Use current 'tasks' for DnD order
        const indexB = tasks.findIndex(t => t.id === b.id);
        return indexA - indexB;
      }
      return a.completed ? 1 : -1; // Incomplete main tasks first
    });

    // Filter for display: only show top-level tasks or sub-tasks whose parent is visible and not completed
    const displayableTasks = sortedInitialTasks.filter(task => {
      if (!task.parentId) return true; // Always show main tasks
      const parent = sortedInitialTasks.find(p => p.id === task.parentId);
      return parent && !parent.completed; // Show sub-task only if its parent is present and not completed
    });

    const mainDisplayTasks = displayableTasks.filter(task => !task.parentId);
    
    mainDisplayTasks.forEach(pt => {
      const group: TaskGroup = {
        mainTask: pt,
        subTasks: displayableTasks.filter(st => st.parentId === pt.id)
                      .sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0)) // ensure sub-tasks are ordered by creation
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
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 items-start' // gap-y increased slightly
          )}
        >
          {taskGroups.map(({ mainTask, subTasks }) => (
            <div
              key={mainTask.id}
              className="flex flex-col gap-2" // Groups items, ensures sub-tasks stack under main
              draggable={true}
              onDragStart={() => handleDragStart(mainTask.id)}
              onDragEnter={() => handleDragEnter(mainTask.id)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(mainTask.id)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <TaskCard
                task={mainTask}
                allTasks={tasks} 
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
                onPrint={handleInitiatePrint}
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
                  isDraggingSelf={false} // Sub-tasks are not individually dragged in this model
                  isDragOverSelf={false} // Sub-tasks are not individual drop targets for groups
                />
              ))}
            </div>
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
