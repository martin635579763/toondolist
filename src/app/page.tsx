
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, ChecklistItem } from '@/types/task';
import { TaskCard } from '@/components/toondo/TaskCard';
import { FileTextIcon, Loader2, LogInIcon, UserPlusIcon, LogOutIcon, UserCircleIcon, PlusSquareIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn, generateId } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; 
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PrintableTaskCard } from '@/components/toondo/PrintableTaskCard';

function HomePageContent() {
  const { currentUser, logout, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState('');


  useEffect(() => {
    setIsLoadingTasks(true);
    const storedTasks = localStorage.getItem('toondo-tasks');
    let parsedTasks: Task[] = [];
    if (storedTasks) {
      try {
        parsedTasks = JSON.parse(storedTasks) as Task[];
      } catch (error) {
        console.error("Error parsing tasks from localStorage:", error);
        parsedTasks = [];
      }
    }

    let tasksToProcess = [...parsedTasks];

    if (currentUser && !authIsLoading) {
      const currentUserTasks = tasksToProcess.filter(task => task.userId === currentUser.id);
      if (currentUserTasks.length === 0) {
        const defaultTitles = ["Today", "This Week", "Later"];
        const defaultTasksForUser: Task[] = defaultTitles.map((title, index) => ({
          id: generateId(),
          title: title,
          description: `Tasks to do ${title.toLowerCase()}.`,
          completed: false,
          dueDate: null,
          backgroundImageUrl: undefined,
          createdAt: Date.now() + index, 
          applicants: [],
          checklistItems: [],
          assignedRoles: [],
          order: index,
          userId: currentUser.id,
          userDisplayName: currentUser.displayName,
          userAvatarUrl: currentUser.avatarUrl,
        }));
        tasksToProcess = [...tasksToProcess, ...defaultTasksForUser];
      }
    }

    const tasksWithDefaults = tasksToProcess.map((task, index) => ({
      ...task,
      description: task.description || "",
      dueDate: task.dueDate || null,
      backgroundImageUrl: task.backgroundImageUrl || undefined,
      applicants: task.applicants || [],
      assignedRoles: task.assignedRoles || [],
      checklistItems: task.checklistItems || [],
      order: task.order ?? index, 
      userId: task.userId || 'unknown_user',
      userDisplayName: task.userDisplayName || 'Unknown User',
      userAvatarUrl: task.userAvatarUrl || '',
      completed: task.completed || false, 
    }));

    setTasks(tasksWithDefaults);
    setIsLoadingTasks(false);
  }, [currentUser, authIsLoading]);


  useEffect(() => {
    if (!isLoadingTasks) {
      localStorage.setItem('toondo-tasks', JSON.stringify(tasks));
    }
  }, [tasks, isLoadingTasks]);


  const handleDirectAddTask = () => {
    if (!newTaskTitle.trim()) {
      toast({ title: "Title Required", description: "Please enter a title for the ToonDo.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to add tasks.", variant: "destructive" });
      return;
    }

    const tasksForCurrentUser = tasks.filter(t => t.userId === currentUser.id);
    const taskWithUserAndDefaults: Task = {
      id: generateId(),
      title: newTaskTitle.trim(),
      description: "", 
      completed: false,
      dueDate: null, 
      backgroundImageUrl: undefined,
      createdAt: Date.now(),
      assignedRoles: [], 
      applicants: [],
      checklistItems: [], 
      order: tasksForCurrentUser.length,
      userId: currentUser.id,
      userDisplayName: currentUser.displayName,
      userAvatarUrl: currentUser.avatarUrl,
    };

    setTasks(prevTasks => [...prevTasks, taskWithUserAndDefaults]);
    setNewTaskTitle(''); 
    toast({
      title: "ToonDo Added!",
      description: `"${taskWithUserAndDefaults.title}" is ready to be tackled!`,
    });
  };

  const handleDeleteTask = (taskToDelete: Task) => {
    if (!taskToDelete || !taskToDelete.id) {
      toast({ title: "Error", description: "Task data is invalid for deletion.", variant: "destructive" });
      return;
    }
    if (!currentUser || currentUser.id !== taskToDelete.userId) {
      toast({ title: "Permission Denied", description: "You can only delete your own tasks.", variant: "destructive" });
      return;
    }

    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete.id));

    toast({
      title: "ToonDo Removed!",
      description: `Task "${taskToDelete.title}" was removed.`,
    });
  };

  const handleAddChecklistItem = (taskId: string, itemTitle: string) => {
    if (!itemTitle.trim()) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          if (!currentUser || currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only add checklist items to your own tasks.", variant: "destructive" });
            return task;
          }
          const newItem: ChecklistItem = {
            id: generateId(),
            title: itemTitle.trim(),
            completed: false,
          };
          const updatedChecklistItems = [...(task.checklistItems || []), newItem];
          return {
            ...task,
            checklistItems: updatedChecklistItems,
            completed: false, 
          };
        }
        return task;
      })
    );
  };

  const handleToggleChecklistItem = (taskId: string, itemId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
           if (!currentUser || currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only modify checklist items on your own tasks.", variant: "destructive" });
            return task;
          }
          const updatedChecklistItems = (task.checklistItems || []).map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );
          
          let newCompletedStatus = false;
          if (updatedChecklistItems.length > 0 && updatedChecklistItems.every(item => item.completed)) {
            newCompletedStatus = true;
          }

          return {
            ...task,
            checklistItems: updatedChecklistItems,
            completed: newCompletedStatus,
          };
        }
        return task;
      })
    );
  };

  const handleDeleteChecklistItem = (taskId: string, itemId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          if (!currentUser || currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only delete checklist items from your own tasks.", variant: "destructive" });
            return task;
          }
          const updatedChecklistItems = (task.checklistItems || []).filter(item => item.id !== itemId);
          
          let newCompletedStatus = false;
          if (updatedChecklistItems.length > 0 && updatedChecklistItems.every(item => item.completed)) {
            newCompletedStatus = true;
          } else if (updatedChecklistItems.length === 0) {
            newCompletedStatus = false; // No items means not complete by this logic
          }


          return { 
            ...task, 
            checklistItems: updatedChecklistItems,
            completed: newCompletedStatus 
          };
        }
        return task;
      })
    );
  };
  
  const handleUpdateChecklistItemTitle = (taskId: string, itemId: string, newTitle: string) => {
    if (!currentUser) {
      toast({ title: "Permission Denied", description: "You must be logged in to update items.", variant: "destructive" });
      return;
    }
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          if (currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only update items in your own tasks.", variant: "destructive" });
            return task;
          }
          const updatedChecklistItems = (task.checklistItems || []).map(item =>
            item.id === itemId ? { ...item, title: newTitle } : item
          );
          return { ...task, checklistItems: updatedChecklistItems };
        }
        return task;
      })
    );
    toast({
      title: "Checklist Item Updated!",
      description: "The item title has been changed.",
    });
  };


  const handleApplyForRole = (taskId: string, roleName: string) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "You must be logged in to apply for roles.", variant: "destructive" });
      return;
    }

    setTasks(prevTasks => {
      const taskIndex = prevTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        toast({ title: "Error", description: "Task not found.", variant: "destructive" });
        return prevTasks;
      }

      const taskToUpdate = { ...prevTasks[taskIndex] };

      if (currentUser.id === taskToUpdate.userId) {
        toast({ title: "Cannot Apply", description: "You cannot apply for roles on your own task.", variant: "default" });
        return prevTasks;
      }

      taskToUpdate.applicants = taskToUpdate.applicants || [];

      const existingApplication = taskToUpdate.applicants.find(
        app => app.applicantUserId === currentUser.id && app.role === roleName
      );

      if (existingApplication) {
        toast({ title: "Already Applied", description: `You've already applied for ${roleName} or your application is pending/accepted.`, variant: "default" });
        return prevTasks;
      }

      const newApplicant = {
        id: generateId(),
        role: roleName,
        name: currentUser.displayName,
        applicantUserId: currentUser.id,
        status: 'pending' as 'pending' | 'accepted' | 'rejected',
      };
      taskToUpdate.applicants.push(newApplicant);

      const updatedTasks = [...prevTasks];
      updatedTasks[taskIndex] = taskToUpdate;

      toast({
        title: "Application Submitted!",
        description: `Your application for the role of '${roleName}' on task "${taskToUpdate.title}" has been sent. The task owner will be notified.`
      });
      return updatedTasks;
    });
  };

  const handleUpdateTaskTitle = (taskId: string, newTitle: string) => {
     if (!currentUser) {
        toast({ title: "Permission Denied", description: "You must be logged in to update tasks.", variant: "destructive" });
        return;
    }
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          if (currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only update titles of your own tasks.", variant: "destructive" });
            return task;
          }
          return { ...task, title: newTitle };
        }
        return task;
      }
      )
    );
    toast({
      title: "Title Updated!",
      description: "The task title has been changed.",
    });
  };

  const handleSetTaskDueDate = (taskId: string, date: Date | null) => {
    if (!currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && task.userId === currentUser.id) {
          return { ...task, dueDate: date ? date.toISOString() : null };
        }
        return task;
      })
    );
    toast({ title: "Due Date Updated!", description: date ? `Due date set to ${format(date, "PPP")}.` : "Due date removed." });
  };

  const handleSetTaskBackgroundImage = (taskId: string, imageUrl: string | null) => {
     if (!currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && task.userId === currentUser.id) {
          return { ...task, backgroundImageUrl: imageUrl || undefined };
        }
        return task;
      })
    );
    toast({ title: "Background Image Updated!", description: imageUrl ? "New background image applied." : "Background image removed." });
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

  const handleDragStart = (taskId: string) => {
    if (!currentUser) return;
    const taskToDrag = tasks.find(t => t.id === taskId);
    if (taskToDrag && taskToDrag.userId === currentUser.id) {
      setDraggedItemId(taskId);
    } else {
      toast({title: "Cannot Reorder", description: "You can only reorder your own tasks.", variant: "default"});
    }
  };

  const handleDragEnter = (taskId: string) => {
    if (!currentUser) return;
    const taskToDragOver = tasks.find(t => t.id === taskId);
    if (taskToDragOver && taskToDragOver.userId === currentUser.id && taskId !== draggedItemId) {
        setDragOverItemId(taskId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItemId(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (droppedOnTaskId: string) => {
    if (!draggedItemId || draggedItemId === droppedOnTaskId || !droppedOnTaskId || !currentUser) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const draggedTask = tasks.find(t => t.id === draggedItemId);
    const droppedOnTask = tasks.find(t => t.id === droppedOnTaskId);

    if (!draggedTask || !droppedOnTask || draggedTask.userId !== currentUser.id || droppedOnTask.userId !== currentUser.id) {
      toast({title: "Cannot Reorder", description: "You can only reorder your own tasks within your own task list.", variant: "default"});
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    setTasks(prevTasks => {
      const allTasksForCurrentUser = prevTasks
        .filter(task => task.userId === currentUser.id)
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

      const taskIds = allTasksForCurrentUser.map(t => t.id);
      const draggedIdx = taskIds.indexOf(draggedItemId);
      const targetIdx = taskIds.indexOf(droppedOnTaskId);

      if (draggedIdx === -1 || targetIdx === -1) {
        console.error("Drag and drop error: task ID not found in current user's task list.");
        return prevTasks;
      }

      const itemToMove = taskIds.splice(draggedIdx, 1)[0];
      taskIds.splice(targetIdx, 0, itemToMove);

      const newTasks = prevTasks.map(task => {
        if (task.userId === currentUser.id) {
          const newOrder = taskIds.indexOf(task.id);
          if (newOrder !== -1) {
            return { ...task, order: newOrder };
          }
        }
        return task;
      });

      return newTasks.sort((a, b) => {
        if (currentUser) {
            if (a.userId === currentUser.id && b.userId !== currentUser.id) return -1;
            if (a.userId !== currentUser.id && b.userId === currentUser.id) return 1;
        }
        const orderA = typeof a.order === 'number' ? a.order : (typeof a.createdAt === 'number' ? a.createdAt : Infinity);
        const orderB = typeof b.order === 'number' ? b.order : (typeof b.createdAt === 'number' ? b.createdAt : Infinity);
        return orderA - orderB;
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

  const displayTasks = [...tasks].sort((a,b) => {
      if (currentUser) {
        if (a.userId === currentUser.id && b.userId !== currentUser.id) return -1;
        if (a.userId !== currentUser.id && b.userId === currentUser.id) return 1;
        if (a.userId === currentUser.id && b.userId === currentUser.id) {
             const orderA = typeof a.order === 'number' ? a.order : (typeof a.createdAt === 'number' ? a.createdAt : Infinity);
             const orderB = typeof b.order === 'number' ? b.order : (typeof b.createdAt === 'number' ? b.createdAt : Infinity);
             return orderA - orderB;
        }
      }
      const orderA = typeof a.order === 'number' ? a.order : (typeof a.createdAt === 'number' ? a.createdAt : Infinity);
      const orderB = typeof b.order === 'number' ? b.order : (typeof b.createdAt === 'number' ? b.createdAt : Infinity);
      return orderA - orderB;
  });


  if (authIsLoading || isLoadingTasks) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading your realm...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-3xl sm:text-4xl font-bold text-primary" style={{ fontFamily: 'var(--font-aldrich), cursive' }}>
                ToonDo List
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              {currentUser ? (
                <>
                   <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="h-9 w-9 border-2 border-primary/50">
                           <AvatarImage src={currentUser.avatarUrl} alt={currentUser.displayName} data-ai-hint="user portrait"/>
                           <AvatarFallback className="bg-primary/20 text-primary">
                               {currentUser.displayName?.charAt(0).toUpperCase()}
                           </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                         <p className="text-xs">Logged in as {currentUser.displayName}</p>
                      </TooltipContent>
                   </Tooltip>
                   <Button variant="ghost" size="sm" asChild>
                     <Link href="/profile">
                       <UserCircleIcon className="mr-2 h-4 w-4" /> Profile
                     </Link>
                   </Button>
                  <Button variant="ghost" onClick={logout} size="sm">
                    <LogOutIcon className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/login"><LogInIcon className="mr-2 h-4 w-4" />Login</Link>
                  </Button>
                  <Button variant="default" size="sm" asChild>
                    <Link href="/register"><UserPlusIcon className="mr-2 h-4 w-4" />Register</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 py-8">
          {!currentUser ? (
            <div className="text-center py-16 bg-card shadow-xl rounded-xl border border-border">
              <UserPlusIcon className="mx-auto h-24 w-24 text-primary opacity-70 mb-6" />
              <h2 className="text-4xl font-semibold mb-3 text-primary">Welcome, Quest Seeker!</h2>
              <p className="text-muted-foreground text-lg mb-6">
                Your adventure awaits, but first, you must identify yourself.
              </p>
              <div className="flex justify-center space-x-4">
                 <Button size="lg" asChild>
                    <Link href="/login"><LogInIcon className="mr-2 h-5 w-5" />Log In to Your Guild</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/register"><UserPlusIcon className="mr-2 h-5 w-5" />Forge a New Legend</Link>
                  </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'flex overflow-x-auto space-x-6 py-4 items-start' 
                )}
              >
                <div className="flex-shrink-0 w-80 bg-card shadow-lg rounded-xl border border-border p-4 sticky left-4 z-10 self-start"> 
                  <h3 className="text-xl font-semibold mb-4 text-primary">Add New ToonDo</h3>
                  <div className="space-y-3">
                    <Input
                      placeholder="Enter task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newTaskTitle.trim()) {
                          handleDirectAddTask();
                        }
                      }}
                      className="text-base"
                      aria-label="New task title"
                    />
                    <Button
                      onClick={handleDirectAddTask}
                      disabled={!newTaskTitle.trim()}
                      className="w-full text-lg py-3"
                    >
                      <PlusSquareIcon className="mr-2 h-5 w-5" /> Add Card
                    </Button>
                  </div>
                </div>

                {displayTasks.filter(task => task.userId === currentUser.id).length === 0 && !isLoadingTasks && !defaultTasksAddedForUser(currentUser.id, tasks) ? (
                  <div className="text-center py-16 pl-6"> 
                    <FileTextIcon className="mx-auto h-24 w-24 text-muted-foreground opacity-50 mb-4" />
                    <h2 className="text-3xl font-semibold mb-2">No ToonDos Yet, {currentUser.displayName}!</h2>
                    <p className="text-muted-foreground text-lg">Time to add some epic quests to your list.</p>
                  </div>
                ) : (
                  displayTasks.map(task => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex-shrink-0 w-80 space-y-4 rounded-lg group/card",
                        currentUser && task.userId === currentUser.id && "cursor-grab",
                        draggedItemId === task.id && "opacity-50 ring-2 ring-primary ring-offset-2",
                        dragOverItemId === task.id && draggedItemId !== task.id && "ring-2 ring-accent ring-offset-1 scale-102 shadow-xl z-10"
                      )}
                      draggable={currentUser && task.userId === currentUser.id}
                      onDragStart={(e) => { e.stopPropagation(); handleDragStart(task.id);}}
                      onDragEnter={(e) => { e.stopPropagation(); handleDragEnter(task.id);}}
                      onDragLeave={(e) => { e.stopPropagation(); handleDragLeave();}}
                      onDrop={(e) => { e.stopPropagation(); handleDrop(task.id);}}
                      onDragOver={(e) => { e.stopPropagation(); handleDragOver(e);}}
                      onDragEnd={(e) => { e.stopPropagation(); handleDragEnd();}}
                    >
                      <TaskCard
                        task={task}
                        currentUser={currentUser}
                        onDelete={handleDeleteTask}
                        onPrint={handleInitiatePrint}
                        onAddChecklistItem={handleAddChecklistItem}
                        onToggleChecklistItem={handleToggleChecklistItem}
                        onDeleteChecklistItem={handleDeleteChecklistItem}
                        onUpdateChecklistItemTitle={handleUpdateChecklistItemTitle}
                        onApplyForRole={handleApplyForRole}
                        onUpdateTaskTitle={handleUpdateTaskTitle}
                        onSetDueDate={handleSetTaskDueDate}
                        onSetBackgroundImage={handleSetTaskBackgroundImage}
                      />
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>

        <div id="printable-area" ref={printableAreaRef} className="hidden print:block">
          {taskToPrint && <PrintableTaskCard task={taskToPrint} />}
        </div>

        <footer className="text-center py-8 border-t border-border mt-auto">
          <p className="text-muted-foreground">
            &copy; {new Date().getFullYear()} ToonDo List. Make your tasks fun!
          </p>
        </footer>
      </div>
    </TooltipProvider>
  );
}

function defaultTasksAddedForUser(userId: string, allTasks?: Task[]): boolean {
  if (!allTasks) return false; 
  const userTasks = allTasks.filter(t => t.userId === userId);
  
  if (userTasks.length === 3) {
    const titles = userTasks.map(t => t.title).sort();
    const defaultTitles = ["Later", "This Week", "Today"].sort();
    return JSON.stringify(titles) === JSON.stringify(defaultTitles);
  }
  return userTasks.length > 0 && userTasks.length < 3; // if some defaults were deleted, still true
}


export default function HomePage() {
  return (
      <HomePageContent />
  );
}

