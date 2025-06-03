
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, ChecklistItem, ActivityLogEntry } from '@/types/task';
import { TaskCard } from '@/components/toondo/TaskCard';
import { FileTextIcon, Loader2, LogInIcon, UserPlusIcon, LogOutIcon, UserCircleIcon, PlusSquareIcon, ImagePlusIcon, TrashIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn, generateId } from '@/lib/utils';
import { format } from "date-fns";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


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

    const tasksWithDefaults = tasksToProcess.map((task, index) => ({
      ...task,
      description: task.description || "",
      dueDate: task.dueDate || null,
      backgroundImageUrl: task.backgroundImageUrl || undefined,
      applicants: task.applicants || [],
      assignedRoles: task.assignedRoles || [],
      checklistItems: (task.checklistItems || []).map(item => ({
        ...item,
        id: item.id || generateId(),
        title: item.title || "Untitled Item",
        description: item.description || "",
        completed: item.completed || false,
        dueDate: item.dueDate || null,
        assignedUserId: item.assignedUserId || null,
        assignedUserName: item.assignedUserName || null,
        assignedUserAvatarUrl: item.assignedUserAvatarUrl || null,
        imageUrl: item.imageUrl || null,
        imageAiHint: item.imageAiHint || null,
        comments: item.comments || [],
        label: Array.isArray(item.label) ? item.label : (item.label ? [item.label] : []),
        activityLog: item.activityLog || [],
      })),
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
    if (!itemTitle.trim() || !currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          if (currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only add checklist items to your own tasks.", variant: "destructive" });
            return task;
          }
          const newItem: ChecklistItem = {
            id: generateId(),
            title: itemTitle.trim(),
            description: "",
            completed: false,
            dueDate: null,
            assignedUserId: null,
            assignedUserName: null,
            assignedUserAvatarUrl: null,
            imageUrl: null,
            imageAiHint: null,
            comments: [],
            label: [],
            activityLog: [{
              id: generateId(),
              timestamp: Date.now(),
              actorName: currentUser.displayName,
              action: 'created item',
              details: `with title "${itemTitle.trim()}"`
            }],
          };
          const updatedChecklistItems = [...(task.checklistItems || []), newItem];
          return {
            ...task,
            checklistItems: updatedChecklistItems,
            completed: false, // Adding an item makes the parent task incomplete
          };
        }
        return task;
      })
    );
  };

  const handleToggleChecklistItem = (taskId: string, itemId: string) => {
    if (!currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
           if (currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only modify checklist items on your own tasks.", variant: "destructive" });
            return task;
          }
          let toggledItem: ChecklistItem | undefined;
          const updatedChecklistItems = (task.checklistItems || []).map(item => {
            if (item.id === itemId) {
              toggledItem = item;
              const activityLogEntry: ActivityLogEntry = {
                id: generateId(),
                timestamp: Date.now(),
                actorName: currentUser.displayName,
                action: item.completed ? 'marked as incomplete' : 'marked as complete',
                details: `Item: "${item.title}"`
              };
              return { 
                ...item, 
                completed: !item.completed,
                activityLog: [activityLogEntry, ...(item.activityLog || [])]
              };
            }
            return item;
          });

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
     if (!currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          if (currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only delete checklist items from your own tasks.", variant: "destructive" });
            return task;
          }
          const itemToDelete = (task.checklistItems || []).find(it => it.id === itemId);
          if (!itemToDelete) return task;

          // Log deletion on the parent task if needed, or consider if item logs are sufficient
          // For now, deletion just removes the item. If a "deleted item X" log is needed on the task itself, add here.

          const updatedChecklistItems = (task.checklistItems || []).filter(item => item.id !== itemId);

          let newCompletedStatus = false;
          if (updatedChecklistItems.length > 0 && updatedChecklistItems.every(item => item.completed)) {
            newCompletedStatus = true;
          } else if (updatedChecklistItems.length === 0) {
            // If all items deleted, parent task completion status depends on its own state or could be set to false
            // For now, retain previous parent completion if no items remain, or set to false. Let's set to false.
            newCompletedStatus = false; 
          } else {
             newCompletedStatus = task.completed; // Keep parent status if some items remain
          }

          toast({ title: "Checklist Item Deleted", description: `"${itemToDelete.title}" was removed.` });
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
          const updatedChecklistItems = (task.checklistItems || []).map(item => {
            if (item.id === itemId) {
              if (item.title === newTitle) return item; // No change
              const activityLogEntry: ActivityLogEntry = {
                id: generateId(),
                timestamp: Date.now(),
                actorName: currentUser.displayName,
                action: 'updated title',
                details: `from "${item.title}" to "${newTitle}"`,
              };
              return { 
                ...item, 
                title: newTitle,
                activityLog: [activityLogEntry, ...(item.activityLog || [])]
              };
            }
            return item;
          });
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

  const handleUpdateChecklistItemDescription = (taskId: string, itemId: string, newDescription: string) => {
    if (!currentUser) {
      toast({ title: "Permission Denied", description: "You must be logged in to update items.", variant: "destructive" });
      return;
    }
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          if (currentUser.id !== task.userId) {
            toast({ title: "Permission Denied", description: "You can only update item descriptions in your own tasks.", variant: "destructive" });
            return task;
          }
          const updatedChecklistItems = (task.checklistItems || []).map(item => {
            if (item.id === itemId) {
              if ((item.description || "") === newDescription) return item; // No change
              const activityLogEntry: ActivityLogEntry = {
                id: generateId(),
                timestamp: Date.now(),
                actorName: currentUser.displayName,
                action: 'updated description',
                details: newDescription ? `to "${newDescription.substring(0,30)}..."` : "cleared description",
              };
              return { 
                ...item, 
                description: newDescription,
                activityLog: [activityLogEntry, ...(item.activityLog || [])] 
              };
            }
            return item;
          });
          return { ...task, checklistItems: updatedChecklistItems };
        }
        return task;
      })
    );
    toast({
      title: "Checklist Item Updated!",
      description: "The item description has been changed.",
    });
  };

  const handleSetChecklistItemDueDate = (taskId: string, itemId: string, date: Date | null) => {
    if (!currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && task.userId === currentUser.id) {
          const updatedChecklistItems = (task.checklistItems || []).map(item => {
            if (item.id === itemId) {
              const oldDueDate = item.dueDate ? format(new Date(item.dueDate), "PPP") : "none";
              const newDueDateString = date ? format(date, "PPP") : "none";
              if (item.dueDate === (date ? date.toISOString() : null)) return item; // No change

              const activityLogEntry: ActivityLogEntry = {
                id: generateId(),
                timestamp: Date.now(),
                actorName: currentUser.displayName,
                action: date ? 'set due date' : 'cleared due date',
                details: date ? `to ${newDueDateString}` : `from ${oldDueDate}`,
              };
              return { 
                ...item, 
                dueDate: date ? date.toISOString() : null,
                activityLog: [activityLogEntry, ...(item.activityLog || [])] 
              };
            }
            return item;
          });
          return { ...task, checklistItems: updatedChecklistItems };
        }
        return task;
      })
    );
    toast({ title: "Item Due Date Updated!", description: date ? `Item due date set to ${format(date, "PPP")}.` : "Item due date removed." });
  };

  const handleAssignUserToChecklistItem = (taskId: string, itemId: string, userId: string | null, userName: string | null, userAvatarUrl: string | null) => {
    if (!currentUser) return;
     setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && task.userId === currentUser.id) {
          const updatedChecklistItems = (task.checklistItems || []).map(item => {
            if (item.id === itemId) {
              if (item.assignedUserId === userId) return item; // No change
              const oldAssignee = item.assignedUserName || "no one";
              const newAssignee = userName || "no one";

              const activityLogEntry: ActivityLogEntry = {
                id: generateId(),
                timestamp: Date.now(),
                actorName: currentUser.displayName,
                action: userName ? 'assigned user' : 'unassigned user',
                details: userName ? `to ${newAssignee}` : `from ${oldAssignee}`,
              };
              return { 
                ...item, 
                assignedUserId: userId, 
                assignedUserName: userName, 
                assignedUserAvatarUrl: userAvatarUrl,
                activityLog: [activityLogEntry, ...(item.activityLog || [])] 
              };
            }
            return item;
          });
          return { ...task, checklistItems: updatedChecklistItems };
        }
        return task;
      })
    );
    toast({ title: "Item Assignment Updated!", description: userName ? `Item assigned to ${userName}.` : "Item unassigned." });
  };

  const handleSetChecklistItemImage = (taskId: string, itemId: string, imageUrl: string | null, imageAiHint: string | null) => {
    if (!currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && task.userId === currentUser.id) {
          const updatedChecklistItems = (task.checklistItems || []).map(item => {
            if (item.id === itemId) {
              if (item.imageUrl === imageUrl) return item; // No change
              const activityLogEntry: ActivityLogEntry = {
                id: generateId(),
                timestamp: Date.now(),
                actorName: currentUser.displayName,
                action: imageUrl ? 'set image' : 'cleared image',
                details: imageUrl ? `added an image for "${item.title}"` : `removed image for "${item.title}"`,
              };
              return { 
                ...item, 
                imageUrl, 
                imageAiHint,
                activityLog: [activityLogEntry, ...(item.activityLog || [])] 
              };
            }
            return item;
          });
          return { ...task, checklistItems: updatedChecklistItems };
        }
        return task;
      })
    );
  };

  const handleSetChecklistItemLabel = (taskId: string, itemId: string, newLabels: string[] | null) => {
    if (!currentUser) return;
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId && task.userId === currentUser.id) {
          const updatedChecklistItems = (task.checklistItems || []).map(item => {
            if (item.id === itemId) {
              const currentLabels = item.label || [];
              const finalNewLabels = newLabels || [];
              const labelsChanged = currentLabels.length !== finalNewLabels.length || !currentLabels.every(label => finalNewLabels.includes(label));
              if (!labelsChanged) return item; // No change

              // Activity logging for labels removed as per request
              // const activityLogEntry: ActivityLogEntry = {
              //   id: generateId(),
              //   timestamp: Date.now(),
              //   actorName: currentUser.displayName,
              //   action: 'updated labels',
              //   details: finalNewLabels.length > 0 ? `set labels for "${item.title}"` : `cleared labels for "${item.title}"`,
              // };
              return { 
                ...item, 
                label: finalNewLabels,
                // activityLog: [activityLogEntry, ...(item.activityLog || [])] 
              };
            }
            return item;
          });
          return { ...task, checklistItems: updatedChecklistItems };
        }
        return task;
      })
    );
    toast({ title: "Item Labels Updated!", description: newLabels && newLabels.length > 0 ? `Labels updated.` : "Labels cleared." });
  };


  const handleApplyForRole = (taskId: string, roleName: string) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "You must be logged in to apply for roles.", variant: "destructive" });
      return;
    }
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
    toast({ title: "Card Due Date Updated!", description: date ? `Card due date set to ${format(date, "PPP")}.` : "Card due date removed." });
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

  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('toondo-users');
      localStorage.removeItem('toondo-current-user');
      localStorage.removeItem('toondo-tasks');
      toast({ title: "Local Storage Cleared", description: "All app data has been removed from your browser." });
      window.location.reload();
    }
  };


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

                {displayTasks.filter(task => task.userId === currentUser.id).length === 0 && !isLoadingTasks ? (
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
                        onUpdateChecklistItemDescription={handleUpdateChecklistItemDescription}
                        onSetChecklistItemDueDate={handleSetChecklistItemDueDate}
                        onAssignUserToChecklistItem={handleAssignUserToChecklistItem}
                        onSetChecklistItemImage={handleSetChecklistItemImage}
                        onSetChecklistItemLabel={handleSetChecklistItemLabel}
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
          <div className="mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <TrashIcon className="mr-2 h-4 w-4" /> Clear Local Storage
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all ToonDo users and tasks from your browser's local storage. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearLocalStorage}>
                    Yes, clear storage
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default function HomePage() {
  return (
      <HomePageContent />
  );
}

    