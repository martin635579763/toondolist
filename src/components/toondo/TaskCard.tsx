
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, InfoIcon, UsersIcon, UserCheckIcon, ClockIcon, UserPlusIcon as ApplyIcon, PlusCircleIcon, XIcon, ListChecksIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, getContrastingTextColor, generateId } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// AddSubTaskForm import removed

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
  hasIncompleteChecklistItems
}: TaskCardProps) {
  const textColor = getContrastingTextColor(task.color);
  const isOwner = currentUser && currentUser.id === task.userId;
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState("");

  const cardStyle: React.CSSProperties = {
    backgroundColor: task.color,
    color: textColor,
    borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
  };

  const textStyle = { color: textColor };
  const mutedTextStyle = { color: textColor, opacity: 0.8 };

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
        "flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 relative",
        task.completed && "opacity-60 ring-2 ring-green-500"
      )}
      style={cardStyle}
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
          <div className="flex-grow">
            <CardTitle className="text-xl font-bold break-words" style={textStyle}>
              {task.title}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {(task.userAvatarUrl || task.userDisplayName) && (
             <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-7 w-7 border" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}}>
                      <AvatarImage src={task.userAvatarUrl} alt={task.userDisplayName} data-ai-hint="user portrait"/>
                      <AvatarFallback style={{backgroundColor: task.color, color: textColor, borderStyle: 'solid', borderWidth: '1px', borderColor: textColor, fontSize: '0.7rem'}}>
                          {task.userDisplayName?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Quest Giver: {task.userDisplayName}</p>
                </TooltipContent>
              </Tooltip>
              </TooltipProvider>
            )}
            {task.completed && <PartyPopperIcon className="ml-1 shrink-0 h-5 w-5" style={{color: textColor === '#FFFFFF' ? '#FFFF00' : '#FFD700'}} />}
          </div>
        </div>
        {task.description && (
            <CardDescription className="mt-1 break-words text-sm" style={{color: textColor, opacity: 0.85}}>
                {task.description}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-2 p-4 pt-1 min-h-7">
        {task.dueDate && (
          <div className="text-sm flex items-center" style={{color: textColor, opacity: 0.9}}>
            <CalendarDaysIcon className="mr-1 h-3.5 w-3.5" style={textStyle} />
            Due: {format(new Date(task.dueDate), "PP")}
          </div>
        )}

        {task.assignedRoles && task.assignedRoles.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-dashed" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}}>
            <h4 className="text-xs font-semibold uppercase flex items-center mb-0.5" style={mutedTextStyle}>
              <UsersIcon className="mr-1 h-3 w-3" />
              Needed Roles:
            </h4>
            <div className="flex flex-col gap-1 text-xs">
              {task.assignedRoles.map((role, index) => {
                const acceptedApplicant = task.applicants?.find(app => app.role === role && app.status === 'accepted');
                const currentUserApplication = currentUser ? task.applicants?.find(app => app.role === role && app.applicantUserId === currentUser.id) : null;
                const totalPendingForRole = task.applicants?.filter(app => app.role === role && app.status === 'pending').length || 0;

                return (
                  <div key={index} className="flex items-center justify-between" style={textStyle}>
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
                                className="h-5 px-1 py-0 text-[10px]"
                                style={{
                                  backgroundColor: 'rgba(255,255,255,0.15)',
                                  borderColor: textColor,
                                  color: textColor,
                                  lineHeight: 'normal'
                                }}
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
                            <Badge variant="outline" className="py-0 px-1 text-[10px]" style={{borderColor: textColor, color: textColor}}>Open</Badge>
                        )}
                         {isOwner && totalPendingForRole === 0 && (
                             <Badge variant="outline" className="py-0 px-1 text-[10px]" style={{borderColor: textColor, color: textColor}}>Open</Badge>
                        )}
                         {currentUser && !isOwner && totalPendingForRole > 0 && !currentUserApplication && (
                            <Badge variant="outline" className="py-0 px-1 text-[10px]" style={{borderColor: textColor, color: textColor}}>Open</Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Checklist Items Section */}
        {(task.checklistItems && task.checklistItems.length > 0) && (
          <div className="mt-2 pt-2 border-t border-dashed" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}}>
            <h4 className="text-xs font-semibold uppercase flex items-center mb-1" style={mutedTextStyle}>
              <ListChecksIcon className="mr-1 h-3 w-3" />
              Checklist
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {task.checklistItems.map(item => (
                <div key={item.id} className="flex items-center justify-between group text-sm" style={textStyle}>
                  <div className="flex items-center flex-grow">
                    <Checkbox
                      id={`checklist-${task.id}-${item.id}`}
                      checked={item.completed}
                      onCheckedChange={() => onToggleChecklistItem(task.id, item.id)}
                      disabled={!isOwner}
                      className={cn(
                        "h-3.5 w-3.5 mr-2 border-2 data-[state=checked]:bg-green-400 data-[state=checked]:text-white",
                         textColor === '#FFFFFF' ? "border-white/70" : "border-black/50",
                         !isOwner && "cursor-not-allowed opacity-70"
                      )}
                       style={{ borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}
                    />
                    <label
                      htmlFor={`checklist-${task.id}-${item.id}`}
                      className={cn("flex-grow break-all", item.completed && "line-through opacity-70", !isOwner && "cursor-not-allowed")}
                    >
                      {item.title}
                    </label>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 opacity-50 group-hover:opacity-100 hover:bg-white/20 dark:hover:bg-black/20"
                      style={{color: textColor}}
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
          <div className="mt-2 pt-2 border-t border-dashed" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}}>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Add checklist item..."
                value={newChecklistItemTitle}
                onChange={(e) => setNewChecklistItemTitle(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAddChecklistItemSubmit(); }}
                className="h-8 text-sm flex-grow"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: textColor,
                  borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
                }}
                disabled={!isOwner}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddChecklistItemSubmit}
                className="h-8 px-2 py-1 text-xs"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderColor: textColor,
                  color: textColor,
                }}
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
                      "border-2 rounded data-[state=checked]:bg-green-500 data-[state=checked]:text-white h-4 w-4",
                       textColor === '#FFFFFF' ? "border-white/70" : "border-black/50",
                       mainCheckboxDisabled && "cursor-not-allowed opacity-70"
                    )}
                    style={{ borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}
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
              "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm",
              task.completed && "line-through",
              mainCheckboxDisabled && "cursor-not-allowed opacity-70"
            )}
            style={textStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {task.completed ? "Mark Incomplete" : "Mark Complete"}
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-0.5 p-3 pt-1">
        {/* Add Sub-task Popover removed */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onPrint(task);}}
          className="h-7 w-7 hover:bg-white/20 dark:hover:bg-black/20"
          style={{color: textColor}}
          aria-label="Print task"
        >
          <PrinterIcon className="h-4 w-4" />
        </Button>
        {isOwner && (
            <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); onDelete(task);}}
            className="h-7 w-7 hover:bg-white/20 dark:hover:bg-black/20"
            style={{color: textColor}}
            aria-label="Delete task"
            >
            <Trash2Icon className="h-4 w-4" />
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
