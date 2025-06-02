
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, InfoIcon, UsersIcon, UserCheckIcon, ClockIcon, UserPlusIcon as ApplyIcon, PlusCircleIcon, XIcon, Edit3Icon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaskCardProps {
  task: Task;
  currentUser: User | null;
  onToggleComplete: (id: string) => void;
  onDelete: (task: Task) => void;
  onPrint: (task: Task) => void;
  onAddChecklistItem: (taskId: string, itemTitle: string) => void;
  onToggleChecklistItem: (taskId: string, itemId: string) => void;
  onDeleteChecklistItem: (taskId: string, itemId: string) => void;
  onApplyForRole: (taskId: string, roleName: string) => void;
  hasIncompleteChecklistItems: boolean;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => void;
}

export function TaskCard({
  task,
  currentUser,
  onToggleComplete,
  onDelete,
  onPrint,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onApplyForRole,
  hasIncompleteChecklistItems,
  onUpdateTaskTitle,
}: TaskCardProps) {
  const isOwner = currentUser && currentUser.id === task.userId;
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  let mainCheckboxDisabled = false;
  let mainCheckboxTooltipContent: React.ReactNode = null;

  if (!isOwner) {
    mainCheckboxDisabled = true;
    mainCheckboxTooltipContent = <p className="flex items-center text-xs"><InfoIcon className="h-3 w-3 mr-1.5"/>Only the owner can change completion status.</p>;
  } else if (hasIncompleteChecklistItems && !task.completed) {
    mainCheckboxDisabled = true;
    mainCheckboxTooltipContent = <p className="flex items-center text-xs"><InfoIcon className="h-3 w-3 mr-1.5"/>Complete all checklist items first.</p>;
  }

  const [showFireworks, setShowFireworks] = useState(false);
  const prevCompleted = useRef(task.completed);

  useEffect(() => {
    if (task.completed && !prevCompleted.current) {
      setShowFireworks(true);
      const timer = setTimeout(() => setShowFireworks(false), 4000);
      return () => clearTimeout(timer);
    }
    prevCompleted.current = task.completed;
  }, [task.completed]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!isEditingTitle) {
      setEditableTitle(task.title);
    }
  }, [task.title, isEditingTitle]);


  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableTitle(e.target.value);
  };

  const saveTitle = () => {
    if (isOwner && editableTitle.trim() && editableTitle.trim() !== task.title) {
      onUpdateTaskTitle(task.id, editableTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveTitle();
    } else if (e.key === 'Escape') {
      setEditableTitle(task.title); 
      setIsEditingTitle(false);
    }
  };

  const handleTitleBlur = () => {
    saveTitle();
  };


  const handleAddChecklistItemSubmit = () => {
    if (newChecklistItemTitle.trim()) {
      onAddChecklistItem(task.id, newChecklistItemTitle.trim());
      setNewChecklistItemTitle("");
    }
  };
  
  const getAllUsersFromStorage = (): User[] => {
    if (typeof window !== 'undefined') {
      const storedUsers = localStorage.getItem('toondo-users'); 
      try {
        return storedUsers ? JSON.parse(storedUsers) : [];
      } catch (e) {
        console.error("Error parsing users from localStorage in TaskCard:", e);
        return [];
      }
    }
    return [];
  };


  return (
    <Card
      className={cn(
        "flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 relative bg-card text-card-foreground border-border",
        task.completed && "opacity-60 ring-2 ring-green-500"
      )}
    >
      {showFireworks && (
        <div className="fireworks-container">
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = Math.random() * 360;
            const radius = 30 + Math.random() * 70;
            const txVal = Math.cos(angle * Math.PI / 180) * radius;
            const tyVal = Math.sin(angle * Math.PI / 180) * radius;

            const tx = txVal + 'px';
            const ty = tyVal + 'px';
            const delay = Math.random() * 0.4;
            const particleColors = ['#FFD700', '#FF6347', '#ADFF2F', '#87CEEB', '#DA70D6', '#FFFFFF'];
            const color = particleColors[Math.floor(Math.random() * particleColors.length)];
            return (
              <div
                key={i}
                className="firework-particle"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: color,
                  animationDelay: `${delay}s`,
                  // @ts-ignore
                  '--tx': tx,
                  // @ts-ignore
                  '--ty': ty,
                }}
              />
            );
          })}
        </div>
      )}

      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-grow mr-2">
            {isEditingTitle && isOwner ? (
              <Input
                ref={titleInputRef}
                type="text"
                value={editableTitle}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleBlur}
                className="text-xl font-bold h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent"
                aria-label="Edit task title"
              />
            ) : (
              <CardTitle
                className={cn(
                  "text-xl font-bold break-words",
                  isOwner && "cursor-pointer hover:text-primary transition-colors"
                )}
                onClick={() => {
                  if (isOwner) {
                    setEditableTitle(task.title); 
                    setIsEditingTitle(true);
                  }
                }}
                title={isOwner ? "Click to edit title" : undefined}
              >
                {task.title}
                 {isOwner && !isEditingTitle && <Edit3Icon className="inline-block ml-2 h-3 w-3 text-muted-foreground opacity-0 group-hover/card:opacity-50 transition-opacity" />}
              </CardTitle>
            )}
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {task.completed && <PartyPopperIcon className="ml-1 shrink-0 h-5 w-5 text-yellow-400" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 p-4 pt-1 min-h-7">
        {task.dueDate && (
          <div className="text-sm flex items-center text-muted-foreground">
            <CalendarDaysIcon className="mr-1 h-3.5 w-3.5" />
            Due: {format(new Date(task.dueDate), "PP")}
          </div>
        )}

        {task.assignedRoles && task.assignedRoles.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-dashed border-border/50">
            <h4 className="text-xs font-semibold uppercase flex items-center mb-0.5 text-muted-foreground">
              <UsersIcon className="mr-1 h-3 w-3" />
              Needed Roles:
            </h4>
            <div className="flex flex-col gap-1 text-xs">
              {task.assignedRoles.map((role, index) => {
                const acceptedApplicant = task.applicants?.find(app => app.role === role && app.status === 'accepted');
                const currentUserApplication = currentUser ? task.applicants?.find(app => app.role === role && app.applicantUserId === currentUser.id) : null;
                const totalPendingForRole = task.applicants?.filter(app => app.role === role && app.status === 'pending').length || 0;

                return (
                  <div key={index} className="flex items-center justify-between text-card-foreground">
                    <span className="mr-1">- {role}:</span>
                    {acceptedApplicant ? (
                      <Badge variant="default" className="py-0 px-1 text-[10px] bg-green-500/80 hover:bg-green-500 text-white flex items-center gap-0.5">
                        <UserCheckIcon className="h-2.5 w-2.5"/>
                         {(() => {
                          if (!acceptedApplicant.applicantUserId) return acceptedApplicant.name; 
                          const allUsers = getAllUsersFromStorage();
                          const applicantUser = allUsers.find(u => u.id === acceptedApplicant.applicantUserId);
                          if (applicantUser) {
                            return (
                              <>
                                {applicantUser.avatarUrl && (
                                  <Avatar className="h-3.5 w-3.5 border-white/50">
                                    <AvatarImage src={applicantUser.avatarUrl} alt={applicantUser.displayName} data-ai-hint="user portrait"/>
                                    <AvatarFallback className="text-[7px] bg-transparent text-white">
                                      {applicantUser.displayName?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <span className="ml-0.5">{applicantUser.displayName}</span>
                              </>
                            );
                          }
                          return acceptedApplicant.name; 
                        })()}
                      </Badge>
                    ) : currentUserApplication ? (
                       <Badge variant={currentUserApplication.status === 'pending' ? 'secondary' : 'destructive'} className="py-0 px-1 text-[10px]">
                         <ClockIcon className="h-2.5 w-2.5 mr-0.5"/> Applied ({currentUserApplication.status})
                       </Badge>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        {totalPendingForRole > 0 && (
                           <Badge variant="secondary" className="py-0 px-1 text-[10px]">
                             {totalPendingForRole} Pending
                           </Badge>
                        )}
                        {currentUser && !isOwner && !currentUserApplication && (
                         <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-5 px-1 py-0 text-[10px] text-card-foreground border-card-foreground/50 hover:bg-accent hover:text-accent-foreground"
                                onClick={(e) => { e.stopPropagation(); onApplyForRole(task.id, role); }}
                              >
                                <ApplyIcon className="h-2.5 w-2.5 mr-0.5"/> Apply
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top"><p className="text-xs">Apply for {role}</p></TooltipContent>
                          </Tooltip>
                          </TooltipProvider>
                        )}
                         {!currentUser && totalPendingForRole === 0 && (
                            <Badge variant="outline" className="py-0 px-1 text-[10px]">Open</Badge>
                        )}
                         {isOwner && totalPendingForRole === 0 && (
                             <Badge variant="outline" className="py-0 px-1 text-[10px]">Open</Badge>
                        )}
                         {currentUser && !isOwner && totalPendingForRole > 0 && !currentUserApplication && (
                            <Badge variant="outline" className="py-0 px-1 text-[10px]">Open</Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(task.checklistItems && task.checklistItems.length > 0) && (
          <div className="mt-2 pt-2 border-t border-dashed border-border/50">
            <div className="space-y-1 pr-1">
              {task.checklistItems.map(item => (
                <div key={item.id} className="flex items-center justify-between group/checklist text-sm text-card-foreground border border-border/60 rounded-md p-1.5">
                  <div className="flex items-center flex-grow min-w-0 relative"> 
                    <Checkbox
                      id={`checklist-${task.id}-${item.id}`}
                      checked={item.completed}
                      onCheckedChange={() => onToggleChecklistItem(task.id, item.id)}
                      disabled={!isOwner}
                      className={cn(
                        "h-3.5 w-3.5 border-2 rounded-full data-[state=checked]:bg-green-400 data-[state=checked]:text-primary-foreground border-muted-foreground shrink-0", 
                        "transition-opacity duration-200 ease-in-out", 
                        "absolute left-0 top-1/2 -translate-y-1/2 z-10", 
                        isOwner 
                          ? "opacity-0 group-hover/checklist:opacity-100 group-focus-within/checklist:opacity-100" 
                          : "opacity-50 cursor-not-allowed" 
                      )}
                    />
                    <label
                      htmlFor={`checklist-${task.id}-${item.id}`}
                      className={cn(
                        "flex-grow break-all truncate", 
                        "transition-all duration-200 ease-in-out", 
                        isOwner 
                          ? "pl-0 group-hover/checklist:pl-[calc(0.875rem+0.5rem)] group-focus-within/checklist:pl-[calc(0.875rem+0.5rem)]" 
                          : "pl-[calc(0.875rem+0.5rem)]", 
                        item.completed && "line-through opacity-70",
                        !isOwner && "cursor-not-allowed"
                      )}
                    >
                      {item.title}
                    </label>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 opacity-0 group-hover/checklist:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-opacity duration-150 shrink-0"
                      onClick={() => onDeleteChecklistItem(task.id, item.id)}
                      aria-label="Delete checklist item"
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div className="mt-2 pt-2 border-t border-dashed border-border/50">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Add checklist item..."
                value={newChecklistItemTitle}
                onChange={(e) => setNewChecklistItemTitle(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAddChecklistItemSubmit(); }}
                className="h-8 text-sm flex-grow bg-background/50 border-input"
                disabled={!isOwner}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddChecklistItemSubmit}
                className="h-8 px-2 py-1 text-xs"
                disabled={!isOwner || !newChecklistItemTitle.trim()}
              >
                <PlusCircleIcon className="h-3 w-3 mr-1"/> Add
              </Button>
            </div>
          </div>
        )}


        <div className="flex items-center pt-1.5 space-x-1.5 mt-2">
          <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild disabled={mainCheckboxDisabled}>
                <Checkbox
                    id={`complete-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => {
                        if (!mainCheckboxDisabled) {
                            onToggleComplete(task.id);
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={mainCheckboxDisabled}
                    className={cn(
                      "border-2 rounded data-[state=checked]:bg-green-500 data-[state=checked]:text-primary-foreground h-4 w-4 border-muted-foreground",
                       mainCheckboxDisabled && "cursor-not-allowed opacity-70"
                    )}
                    aria-labelledby={`label-complete-${task.id}`}
                />
            </TooltipTrigger>
            {mainCheckboxTooltipContent && (
                <TooltipContent>
                    {mainCheckboxTooltipContent}
                </TooltipContent>
            )}
          </Tooltip>
          </TooltipProvider>
          <label
            htmlFor={`complete-${task.id}`}
            id={`label-complete-${task.id}`}
            className={cn(
              "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm text-card-foreground",
              task.completed && "line-through",
              mainCheckboxDisabled && "cursor-not-allowed opacity-70"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {task.completed ? "Mark Incomplete" : "Mark Complete"}
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-0.5 p-3 pt-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onPrint(task);}}
          className="h-7 w-7 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
          aria-label="Print task"
        >
          <PrinterIcon className="h-4 w-4" />
        </Button>
        {isOwner && (
            <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(task);}}
            className="h-7 w-7 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground"
            aria-label="Delete task"
            >
            <Trash2Icon className="h-4 w-4" />
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
    


    



