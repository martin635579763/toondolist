"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task } from '@/types/task';
import { CreateTaskForm } from '@/components/toondo/CreateTaskForm';
import { TaskCard } from '@/components/toondo/TaskCard';
import { PrintableTaskCard } from '@/components/toondo/PrintableTaskCard';
import { Button } from '@/components/ui/button';
import { FileTextIcon, LayoutGridIcon, ListIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { cn } from '@/lib/utils';

type LayoutMode = "grid" | "list";

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>(() => {
     if (typeof window !== 'undefined') {
      const savedTasks = localStorage.getItem('toondoTasks');
      return savedTasks ? JSON.parse(savedTasks) : [];
    }
    return [];
  });
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const { toast } = useToast();
  const printableAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('toondoTasks', JSON.stringify(tasks));
    }
  }, [tasks]);

  const handleAddTask = (newTask: Task) => {
    setTasks(prevTasks => [newTask, ...prevTasks].sort((a,b) => b.createdAt - a.createdAt));
    toast({
      title: "ToonDo Added!",
      description: `"${newTask.title}" is ready to be tackled!`,
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
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
    toast({
      title: "ToonDo Removed!",
      description: "One less task on your list.",
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
      const timer = setTimeout(() => { // Allow state to update and component to render
        actualPrint();
        setTaskToPrint(null); // Reset after print dialog
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
      setTaskToPrint(null); // Ensure it's reset
    };

    window.addEventListener('afterprint', afterPrintHandler);
    return () => {
      window.removeEventListener('afterprint', afterPrintHandler);
    };
  }, []);


  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      return (b.createdAt || 0) - (a.createdAt || 0); // Newest first
    }
    return a.completed ? 1 : -1; // Incomplete tasks first
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

      {tasks.length > 0 && (
        <div className="mb-6 flex justify-end items-center">
          <span className="text-sm text-muted-foreground mr-2">View:</span>
          <Button
            variant={layoutMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setLayoutMode('grid')}
            aria-label="Grid view"
            className="mr-2"
          >
            <LayoutGridIcon className="h-5 w-5" />
          </Button>
          <Button
            variant={layoutMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setLayoutMode('list')}
            aria-label="List view"
          >
            <ListIcon className="h-5 w-5" />
          </Button>
        </div>
      )}
      
      {tasks.length === 0 ? (
         <div className="text-center py-16">
          <FileTextIcon className="mx-auto h-24 w-24 text-muted-foreground opacity-50 mb-4" />
          <h2 className="text-3xl font-semibold mb-2">No ToonDos Yet!</h2>
          <p className="text-muted-foreground text-lg">Time to add some fun tasks to your list.</p>
        </div>
      ) : (
        <div
          className={cn(
            layoutMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          )}
        >
          {sortedTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onPrint={handleInitiatePrint}
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
