
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Task, Applicant } from '@/types/task';
import { CreateTaskForm } from '@/components/toondo/CreateTaskForm';
import { EditTaskDialog } from '@/components/toondo/EditTaskDialog';
import { TaskCard } from '@/components/toondo/TaskCard';
import { FileTextIcon, Loader2, LogInIcon, UserPlusIcon, LogOutIcon, CaseSensitiveIcon, UserCircleIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn, generateId } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
// Removed TaskSummarySidebar import
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { parseMarkdownToTasks, type ParseMarkdownInput, type ParseMarkdownOutput } from '@/ai/flows/parse-markdown-tasks-flow';
import { getRandomColor } from '@/lib/colors';
import { PrintableTaskCard } from '@/components/toondo/PrintableTaskCard';


interface TaskGroup {
  mainTask: Task;
  subTasks: Task[];
  mainTaskHasIncompleteSubtasks: boolean;
}

function HomePageContent() {
  const { currentUser, logout, isLoading: authIsLoading } = useAuth();
  const { toast, dismiss } = useToast();
  const printableAreaRef = useRef<HTMLDivElement>(null);
  const [taskToPrint, setTaskToPrint] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [markdownInput, setMarkdownInput] = useState<string>('');
  const [isParsingMarkdown, setIsParsingMarkdown] = useState<boolean>(false);


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
    
    const tasksWithDefaults = parsedTasks.map((task, index) => ({
      ...task,
      applicants: task.applicants || [],
      assignedRoles: task.assignedRoles || [],
      order: task.order ?? (task.parentId ? undefined : index), 
      userId: task.userId || 'unknown_user', 
      userDisplayName: task.userDisplayName || 'Unknown User',
      userAvatarUrl: task.userAvatarUrl || '',
    }));
    setTasks(tasksWithDefaults);
    setIsLoadingTasks(false);
  }, []);


  useEffect(() => {
    if (!isLoadingTasks) { 
      localStorage.setItem('toondo-tasks', JSON.stringify(tasks));
    }
  }, [tasks, isLoadingTasks]);


  const handleAddTask = (newTask: Task) => {
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to add tasks.", variant: "destructive" });
      return;
    }

    const mainTasksForCurrentUser = tasks.filter(t => !t.parentId && t.userId === currentUser.id);
    const taskWithUserAndDefaults: Task = {
      ...newTask,
      id: newTask.id || generateId(),
      createdAt: newTask.createdAt || Date.now(),
      applicants: newTask.applicants || [],
      assignedRoles: newTask.assignedRoles || [],
      order: newTask.parentId ? undefined : mainTasksForCurrentUser.length,
      userId: currentUser.id,
      userDisplayName: currentUser.displayName,
      userAvatarUrl: currentUser.avatarUrl,
      color: newTask.color || getRandomColor(), 
    };

    let newTasksList = [...tasks, taskWithUserAndDefaults];
    if (newTask.parentId) {
      const parentTask = newTasksList.find(t => t.id === newTask.parentId);
      if (parentTask && parentTask.completed && !taskWithUserAndDefaults.completed) {
        newTasksList = newTasksList.map(t =>
          t.id === parentTask.id ? { ...t, completed: false } : t
        );
      }
    }
    setTasks(newTasksList);

    toast({
      title: "ToonDo Added!",
      description: `"${newTask.title}" is ready ${newTask.parentId ? 'as a sub-task!' : 'to be tackled!'}`,
    });
  };

  const handleParseAndAddTasks = async () => {
    if (!markdownInput.trim()) {
      toast({ title: "Empty Input", description: "Please enter some markdown to parse.", variant: "default" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Not Logged In", description: "You must be logged in to create tasks from markdown.", variant: "destructive" });
      return;
    }

    setIsParsingMarkdown(true);
    try {
      const result: ParseMarkdownOutput = await parseMarkdownToTasks({ markdownContent: markdownInput });
      if (result.parsedTasks && result.parsedTasks.length > 0) {
        let tasksAddedCount = 0;
        result.parsedTasks.forEach(parsedMainTask => {
          const mainTaskId = generateId();
          const mainTaskToAdd: Task = {
            id: mainTaskId,
            title: parsedMainTask.title,
            description: parsedMainTask.description || "",
            completed: false,
            dueDate: null, 
            color: getRandomColor(),
            createdAt: Date.now() + tasksAddedCount, 
            assignedRoles: parsedMainTask.assignedRolesString ? parsedMainTask.assignedRolesString.split(',').map(r => r.trim()).filter(r => r) : [],
            applicants: [],
            userId: currentUser.id,
            userDisplayName: currentUser.displayName,
            userAvatarUrl: currentUser.avatarUrl,
          };
          handleAddTask(mainTaskToAdd);
          tasksAddedCount++;

          if (parsedMainTask.subTasks && parsedMainTask.subTasks.length > 0) {
            parsedMainTask.subTasks.forEach(parsedSubTask => {
              const subTaskToAdd: Task = {
                id: generateId(),
                title: parsedSubTask.title,
                description: parsedSubTask.description || "",
                completed: false,
                dueDate: null,
                color: getRandomColor(),
                createdAt: Date.now() + tasksAddedCount,
                parentId: mainTaskId,
                applicants: [],
                userId: currentUser.id,
                userDisplayName: currentUser.displayName,
                userAvatarUrl: currentUser.avatarUrl,
              };
              handleAddTask(subTaskToAdd);
              tasksAddedCount++;
            });
          }
        });
        toast({ title: "Tasks Created!", description: `${tasksAddedCount} task(s) were created from your markdown.` });
        setMarkdownInput(''); 
      } else {
        toast({ title: "No Tasks Found", description: "The parser couldn't find any tasks in your markdown, or there was an issue.", variant: "default" });
      }
    } catch (error) {
      console.error("Error parsing markdown to tasks:", error);
      let description = "Could not parse markdown. Please try again.";
      toast({ title: "Parsing Error", description, variant: "destructive" });
    } finally {
      setIsParsingMarkdown(false);
    }
  };


  const handleOpenEditDialog = (task: Task) => {
    if (!currentUser) {
      toast({ title: "Login Required", description: "You must be logged in to edit tasks.", variant: "destructive" });
      return;
    }
     if (currentUser.id !== task.userId) {
      toast({ title: "Permission Denied", description: "You can only edit your own tasks.", variant: "destructive" });
      return;
    }
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = (updatedTaskData: Task, newSubTasksToCreate?: Task[]) => {
    if (!currentUser || !editingTask) {
      toast({ title: "Error", description: "User not logged in or no task selected for editing.", variant: "destructive" });
      return;
    }
    if (currentUser.id !== editingTask.userId) {
      toast({ title: "Permission Denied", description: "You can only update your own tasks.", variant: "destructive" });
      handleCloseEditDialog();
      return;
    }

    let toastDescription = `"${updatedTaskData.title}" has been updated.`;
    let shouldMarkParentIncomplete = false;

    setTasks(prevTasks => {
        let newTasksList = prevTasks.map(task =>
          task.id === editingTask.id ? { 
            ...task, 
            ...updatedTaskData, 
            userId: task.userId, 
            userDisplayName: task.userDisplayName,
            userAvatarUrl: task.userAvatarUrl,
          } : task
        );

        if (newSubTasksToCreate && newSubTasksToCreate.length > 0) {
           const mainTaskInListForSubs = newTasksList.find(t => t.id === editingTask.id);
           if (!mainTaskInListForSubs) {
             console.error("Parent task for new sub-tasks not found in list during update.");
             return newTasksList; 
           }

          const subTasksWithParentAndUser = newSubTasksToCreate.map((subTask, index) => ({
            ...subTask,
            id: subTask.id || generateId(),
            parentId: editingTask.id,
            createdAt: Date.now() + index + 1, 
            applicants: [],
            assignedRoles: [],
            color: subTask.color || getRandomColor(),
            order: undefined, 
            userId: mainTaskInListForSubs.userId, 
            userDisplayName: mainTaskInListForSubs.userDisplayName,
            userAvatarUrl: mainTaskInListForSubs.userAvatarUrl,
            completed: subTask.completed || false,
          }));
          newTasksList = [...newTasksList, ...subTasksWithParentAndUser];
          toastDescription += ` ${newSubTasksToCreate.length} new sub-task${newSubTasksToCreate.length > 1 ? 's were' : ' was'} added.`;
          
          if (mainTaskInListForSubs && mainTaskInListForSubs.completed && subTasksWithParentAndUser.some(st => !st.completed)) {
            shouldMarkParentIncomplete = true;
            newTasksList = newTasksList.map(t =>
              t.id === editingTask.id ? { ...t, completed: false } : t
            );
          }
        }
        return newTasksList;
    });
    
    toast({
      title: "ToonDo Updated!",
      description: toastDescription,
    });
    if (shouldMarkParentIncomplete) {
    }
    handleCloseEditDialog();
  };

 const handleToggleComplete = (id: string) => {
    const taskToToggle = tasks.find(t => t.id === id);
    if (!taskToToggle) return;

    if (!currentUser || currentUser.id !== taskToToggle.userId) {
        toast({ title: "Permission Denied", description: "You can only change the completion status of your own tasks.", variant: "destructive" });
        return;
    }

    const newCompletedStatus = !taskToToggle.completed;

    if (isMainTaskWithIncompleteSubtasks(id) && newCompletedStatus && !taskToToggle.parentId) {
        toast({
            title: "Still have work to do!",
            description: `"${taskToToggle.title}" cannot be completed until all its sub-tasks are done.`,
            variant: "default",
        });
        return; 
    }

    setTasks(prevTasks => {
      let newTasks = prevTasks.map(task =>
        task.id === id ? { ...task, completed: newCompletedStatus } : task
      );

      if (taskToToggle.parentId) { 
        const parentId = taskToToggle.parentId;
        const parentTask = newTasks.find(t => t.id === parentId);
        if (parentTask) {
            const siblingSubTasks = newTasks.filter(t => t.parentId === parentId);
            const allSubTasksNowComplete = siblingSubTasks.every(st => st.completed);

            if (newCompletedStatus && allSubTasksNowComplete && !parentTask.completed) {
                 newTasks = newTasks.map(t => t.id === parentId ? { ...t, completed: true } : t);
            } else if (!newCompletedStatus && parentTask.completed) {
                 newTasks = newTasks.map(t => t.id === parentId ? { ...t, completed: false } : t);
            }
        }
      }
      return newTasks;
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

    let tasksToRemoveIds = [taskToDelete.id];
    let parentIdOfDeletedSubTask: string | undefined = undefined;

    if (!taskToDelete.parentId) { 
      const subTasksOfDeletedMain = tasks.filter(t => t.parentId === taskToDelete.id).map(st => st.id);
      tasksToRemoveIds = [...tasksToRemoveIds, ...subTasksOfDeletedMain];
    } else { 
      parentIdOfDeletedSubTask = taskToDelete.parentId;
    }

    setTasks(prevTasks => {
      let updatedTasks = prevTasks.filter(task => !tasksToRemoveIds.includes(task.id));
      if (parentIdOfDeletedSubTask) {
        const parentTask = updatedTasks.find(t => t.id === parentIdOfDeletedSubTask);
        if (parentTask && !parentTask.completed) {
          const remainingSubTasks = updatedTasks.filter(st => st.parentId === parentIdOfDeletedSubTask);
          if (remainingSubTasks.length === 0 || remainingSubTasks.every(st => st.completed)) {
            updatedTasks = updatedTasks.map(t => t.id === parentIdOfDeletedSubTask ? { ...t, completed: true } : t);
          }
        }
      }
      return updatedTasks;
    });
    
    let toastDescription = `Task "${taskToDelete.title}" ${tasksToRemoveIds.length > 1 ? 'and its sub-tasks were' : 'was'} removed.`;
    toast({
      title: "ToonDo Removed!",
      description: toastDescription,
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

      const newApplicant: Applicant = {
        id: generateId(),
        role: roleName,
        name: currentUser.displayName,
        applicantUserId: currentUser.id,
        status: 'pending',
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
    if (!currentUser) return; 
    const taskToDrag = tasks.find(t => t.id === mainTaskId);
    if (taskToDrag && taskToDrag.userId === currentUser.id) {
      setDraggedItemId(mainTaskId);
    } else {
      toast({title: "Cannot Reorder", description: "You can only reorder your own tasks.", variant: "default"});
    }
  };

  const handleDragEnter = (mainTaskId: string) => {
    if (!currentUser) return;
    const taskToDragOver = tasks.find(t => t.id === mainTaskId);
    if (taskToDragOver && taskToDragOver.userId === currentUser.id && mainTaskId !== draggedItemId) {
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
    if (!draggedItemId || draggedItemId === droppedOnMainTaskId || !droppedOnMainTaskId || !currentUser) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }
    
    const draggedTask = tasks.find(t => t.id === draggedItemId);
    const droppedOnTask = tasks.find(t => t.id === droppedOnMainTaskId);

    if (!draggedTask || !droppedOnTask || draggedTask.userId !== currentUser.id || droppedOnTask.userId !== currentUser.id) {
      toast({title: "Cannot Reorder", description: "You can only reorder your own tasks within your own task list.", variant: "default"});
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    setTasks(prevTasks => {
      const allMainTasksForCurrentUser = prevTasks
        .filter(task => !task.parentId && task.userId === currentUser.id) 
        .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

      const mainTaskIds = allMainTasksForCurrentUser.map(t => t.id);
      const draggedIdx = mainTaskIds.indexOf(draggedItemId);
      const targetIdx = mainTaskIds.indexOf(droppedOnMainTaskId);

      if (draggedIdx === -1 || targetIdx === -1) {
        console.error("Drag and drop error: task ID not found in current user's main task list.");
        return prevTasks;
      }

      const itemToMove = mainTaskIds.splice(draggedIdx, 1)[0];
      mainTaskIds.splice(targetIdx, 0, itemToMove);

      const newTasks = prevTasks.map(task => {
        if (!task.parentId && task.userId === currentUser.id) {
          const newOrder = mainTaskIds.indexOf(task.id);
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
            if (a.userId === currentUser.id && b.userId === currentUser.id) {
                if (!a.parentId && !b.parentId) return (a.order ?? (a.createdAt ?? 0)) - (b.order ?? (b.createdAt ?? 0));
            }
        }
        if (!a.parentId && !b.parentId) return (a.order ?? (a.createdAt ?? 0)) - (b.order ?? (b.createdAt ?? 0));
        if (a.parentId && b.parentId && a.parentId === b.parentId) return (a.createdAt ?? 0) - (b.createdAt ?? 0);
        return (a.createdAt ?? 0) - (b.createdAt ?? 0); 
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
  
  const isMainTaskWithIncompleteSubtasks = (mainTaskId: string) => {
    const subTasksForMain = tasks.filter(t => t.parentId === mainTaskId);
    return subTasksForMain.some(st => !st.completed);
  };

  const taskGroups: TaskGroup[] = [];
  if (tasks && tasks.length > 0) {
    const allMainDisplayTasks = tasks.filter(task => !task.parentId) 
                                  .sort((a,b) => { 
                                      if (currentUser) {
                                        if (a.userId === currentUser.id && b.userId !== currentUser.id) return -1;
                                        if (a.userId !== currentUser.id && b.userId === currentUser.id) return 1;
                                        if (a.userId === currentUser.id && b.userId === currentUser.id) {
                                            return ((a.order ?? (a.createdAt ?? 0)) as number) - ((b.order ?? (b.createdAt ?? 0)) as number);
                                        }
                                      }
                                      return ((a.order ?? (a.createdAt ?? 0)) as number) - ((b.order ?? (b.createdAt ?? 0)) as number);
                                  });
    
    allMainDisplayTasks.forEach(pt => {
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

  if (authIsLoading || isLoadingTasks) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading your realm...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        {/* TaskSummarySidebar removed from here */}
        <SidebarContent>
          {/* You can add other sidebar content here if needed in the future */}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <TooltipProvider>
          <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center">
                  <SidebarTrigger className="mr-3" /> 
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
                  <CreateTaskForm onAddTask={handleAddTask} />

                  <Card className="p-6 bg-card shadow-xl rounded-xl mb-8 border border-border">
                    <CardHeader className="p-0 pb-4">
                      <CardTitle className="text-xl flex items-center">
                        <CaseSensitiveIcon className="mr-2 h-6 w-6 text-primary" />
                        Create Tasks from Markdown
                      </CardTitle>
                      <CardDescription>
                        Paste your structured markdown below. The parser will try to create main tasks and sub-tasks.
                        Example: "# Main Task Title\\n- Subtask 1\\n- Subtask 2\\n## Another Main Task"
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3">
                      <Textarea
                        placeholder="Paste your markdown here..."
                        value={markdownInput}
                        onChange={(e) => setMarkdownInput(e.target.value)}
                        rows={6}
                        className="text-sm"
                        disabled={isParsingMarkdown}
                      />
                      <Button
                        onClick={handleParseAndAddTasks}
                        disabled={isParsingMarkdown || !markdownInput.trim()}
                        className="w-full"
                      >
                        {isParsingMarkdown ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CaseSensitiveIcon className="mr-2 h-4 w-4" />
                        )}
                        Create from Markdown
                      </Button>
                    </CardContent>
                  </Card>
                  
                  {taskGroups.length === 0 && !isLoadingTasks && !markdownInput ? (
                     <div className="text-center py-16">
                      <FileTextIcon className="mx-auto h-24 w-24 text-muted-foreground opacity-50 mb-4" />
                      <h2 className="text-3xl font-semibold mb-2">No ToonDos Yet, {currentUser.displayName}!</h2>
                      <p className="text-muted-foreground text-lg">Time to add some epic quests to your list.</p>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 items-start'
                      )}
                    >
                      {taskGroups.map(({ mainTask, subTasks, mainTaskHasIncompleteSubtasks: groupHasIncompleteSubtasks }) => (
                        <div
                          key={mainTask.id}
                          className="flex flex-col gap-2" 
                          draggable={currentUser && mainTask.userId === currentUser.id} 
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
                            currentUser={currentUser}
                            onToggleComplete={handleToggleComplete}
                            onDelete={handleDeleteTask} 
                            onPrint={handleInitiatePrint}
                            onEdit={handleOpenEditDialog}
                            onApplyForRole={handleApplyForRole}
                            isDraggingSelf={draggedItemId === mainTask.id}
                            isDragOverSelf={dragOverItemId === mainTask.id && draggedItemId !== mainTask.id}
                            isMainTaskWithIncompleteSubtasks={groupHasIncompleteSubtasks}
                          />
                          {subTasks.map(subTask => (
                            <TaskCard
                              key={subTask.id}
                              task={subTask}
                              allTasks={tasks}
                              currentUser={currentUser}
                              onToggleComplete={handleToggleComplete}
                              onDelete={handleDeleteTask} 
                              onPrint={handleInitiatePrint}
                              onEdit={handleOpenEditDialog}
                              onApplyForRole={handleApplyForRole} 
                              isDraggingSelf={false} 
                              isDragOverSelf={false}
                              isMainTaskWithIncompleteSubtasks={false} 
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </main> 
            
            <div id="printable-area" ref={printableAreaRef} className="hidden print:block">
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
