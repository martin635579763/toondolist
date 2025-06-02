
"use client";

import type { Task } from "@/types/task";
import type { User } from "@/types/user"; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, Link2Icon, ListChecks, CircleDot, CheckCircle2, ArrowRightIcon, InfoIcon, UsersIcon, UserCheckIcon, ClockIcon, UserPlusIcon as ApplyIcon, PlusCircleIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, getContrastingTextColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider // Ensure TooltipProvider is imported if not already at page level
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddSubTaskForm } from "./AddSubTaskForm";


interface TaskCardProps {
  task: Task;
  allTasks: Task[];
  currentUser: User | null;
  onToggleComplete: (id: string) => void;
  onDelete: (task: Task) => void;
  onPrint: (task: Task) => void;
  onAddTask: (task: Task) => void; // Added for adding sub-tasks
  onApplyForRole: (taskId: string, roleName: string) => void;
  isMainTaskWithIncompleteSubtasks: boolean;
}

export function TaskCard({
  task,
  allTasks,
  currentUser,
  onToggleComplete,
  onDelete,
  onPrint,
  onAddTask, // Consuming the new prop
  onApplyForRole,
  isMainTaskWithIncompleteSubtasks
}: TaskCardProps) {
  const textColor = getContrastingTextColor(task.color);
  const isSubTask = !!task.parentId;
  const isMainTask = !task.parentId;
  const isOwner = currentUser && currentUser.id === task.userId;

  const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
  const childTasks = allTasks.filter(t => t.parentId === task.id);

  const cardStyle: React.CSSProperties = {
    backgroundColor: task.color,
    color: textColor,
    borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
  };
  
  const textStyle = { color: textColor };
  const mutedTextStyle = { color: textColor, opacity: 0.8 };
  const veryMutedTextStyle = { color: textColor, opacity: 0.6 };

  let checkboxDisabled = false;
  let checkboxTooltipContent: React.ReactNode = null;

  if (!isOwner) {
    checkboxDisabled = true;
    checkboxTooltipContent = <p className="flex items-center text-xs"><InfoIcon className="h-3 w-3 mr-1.5"/>Only the owner can change completion status.</p>;
  } else if (isMainTask && isMainTaskWithIncompleteSubtasks && !task.completed) {
    checkboxDisabled = true;
    checkboxTooltipContent = <p className="flex items-center text-xs"><InfoIcon className="h-3 w-3 mr-1.5"/>Complete all sub-tasks first.</p>;
  }


  const [showFireworks, setShowFireworks] = useState(false);
  const prevCompleted = useRef(task.completed);

  const [isAddSubTaskPopoverOpen, setIsAddSubTaskPopoverOpen] = useState(false);

  useEffect(() => {
    if (task.completed && !prevCompleted.current && isMainTask) { 
      setShowFireworks(true);
      const timer = setTimeout(() => setShowFireworks(false), 4000); 
      return () => clearTimeout(timer); 
    }
    prevCompleted.current = task.completed;
  }, [task.completed, isMainTask]);

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
        task.completed && "opacity-60 ring-2 ring-green-500",
        isSubTask && "ml-0", 
        isMainTask && !isSubTask && " " 
      )}
      style={cardStyle}
    >
      {showFireworks && isMainTask && (
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

      <CardHeader className={cn(
        isSubTask ? "p-3 pt-2 pb-1" : "p-4 pb-2" 
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <CardTitle className={cn(
              "font-bold break-words",
              isSubTask ? "text-md" : "text-xl" 
            )} style={textStyle}>
              {task.title}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {isMainTask && (task.userAvatarUrl || task.userDisplayName) && (
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
            {task.completed && <PartyPopperIcon className={cn("ml-1 shrink-0", isSubTask ? "h-3 w-3 mt-0.5": "h-5 w-5" )} style={{color: textColor === '#FFFFFF' ? '#FFFF00' : '#FFD700'}} />}
          </div>
        </div>

        {parentTask && isSubTask && (
          <Badge variant="outline" className={cn("mt-1 py-0 px-1 w-fit leading-tight", isSubTask ? "text-[10px]" : "text-xs")} style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: textColor }}>
            <Link2Icon className="mr-0.5 h-2.5 w-2.5" />
            Parent: {parentTask.title.length > 15 ? parentTask.title.substring(0, 12) + '...' : parentTask.title}
          </Badge>
        )}
        {task.description && (isSubTask ? (
            <CardDescription className={cn("mt-1 break-words leading-snug max-h-12 overflow-y-auto", isSubTask ? "text-xs" : "text-sm")} style={{color: textColor, opacity: 0.85}}>
                {task.description.length > 70 ? task.description.substring(0, 67) + "..." : task.description}
            </CardDescription>
        ) : (
            <CardDescription className={cn("mt-1 break-words text-sm")} style={{color: textColor, opacity: 0.85}}>
                {task.description}
            </CardDescription>
        ))}
      </CardHeader>
      <CardContent className={cn(
        "flex-grow space-y-1 pt-0 min-h-7", 
        isSubTask ? "p-3 pt-1 pb-1" : "p-4 pt-1" 
      )}>
        {task.dueDate && (
          <div className={cn("flex items-center", isSubTask ? "text-xs" : "text-sm")} style={{color: textColor, opacity: 0.9}}>
            <CalendarDaysIcon className={cn("mr-1", isSubTask ? "h-3 w-3" : "h-3.5 w-3.5")} style={textStyle} />
            Due: {format(new Date(task.dueDate), "PP")}
          </div>
        )}

        {isMainTask && task.assignedRoles && task.assignedRoles.length > 0 && (
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
                            <Badge variant="outline" className="py-0 px-1 text-[10px]" style={{borderColor: textColor, color: textColor}}>
                                Open
                            </Badge>
                        )}
                         {isOwner && totalPendingForRole === 0 && ( 
                             <Badge variant="outline" className="py-0 px-1 text-[10px]" style={{borderColor: textColor, color: textColor}}>
                                Open
                            </Badge>
                        )}
                         {currentUser && !isOwner && totalPendingForRole > 0 && !currentUserApplication && ( 
                            <Badge variant="outline" className="py-0 px-1 text-[10px]" style={{borderColor: textColor, color: textColor}}>
                                Open
                            </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {isMainTask && childTasks.length > 0 && (
           <div className="mt-1.5 pt-1.5 border-t border-dashed" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}}>
            <h4 className="text-xs font-semibold uppercase flex items-center mb-0.5" style={mutedTextStyle}>
              <ListChecks className="mr-1 h-3 w-3" />
              {childTasks.length} Sub-task(s)
            </h4>
            <ul className="list-none pl-0.5 space-y-0">
              {childTasks.slice(0, 3).map(st => {
                const subTaskFull = allTasks.find(t => t.id === st.id);
                return (
                  <li key={st.id} className="text-[11px] flex items-center justify-between group" style={veryMutedTextStyle}>
                    <div className="flex items-center">
                      {subTaskFull?.completed ? <CheckCircle2 className="mr-1 h-2.5 w-2.5 text-green-400 opacity-90" /> : <CircleDot className="mr-1 h-2.5 w-2.5 opacity-70" />}
                      <span className={cn(subTaskFull?.completed && "line-through", "truncate max-w-[150px] sm:max-w-[200px]")}>{st.title}</span>
                    </div>
                     <ArrowRightIcon
                      className="ml-1 h-2.5 w-2.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      stroke={textColor} 
                    />
                  </li>
                );
              })}
              {childTasks.length > 3 && <li className="text-[11px] pl-0.5" style={veryMutedTextStyle}>...and {childTasks.length - 3} more.</li>}
            </ul>
          </div>
        )}

        <div className={cn("flex items-center", isSubTask ? "pt-1 space-x-1" : "pt-1.5 space-x-1.5")}>
          <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild disabled={checkboxDisabled}>
                <Checkbox
                    id={`complete-${task.id}`}
                    checked={task.completed}
                    onCheckedChange={() => {
                        if (!checkboxDisabled) {
                            onToggleComplete(task.id);
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={checkboxDisabled}
                    className={cn(
                    "border-2 rounded data-[state=checked]:bg-green-500 data-[state=checked]:text-white",
                    isSubTask ? "h-3.5 w-3.5" : "h-4 w-4", 
                    textColor === '#FFFFFF' ? "border-white/70" : "border-black/50",
                    checkboxDisabled && "cursor-not-allowed opacity-70"
                    )}
                    style={{ borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}
                    aria-labelledby={`label-complete-${task.id}`}
                />
            </TooltipTrigger>
            {checkboxTooltipContent && (
                <TooltipContent>
                    {checkboxTooltipContent}
                </TooltipContent>
            )}
          </Tooltip>
          </TooltipProvider>
          <label
            htmlFor={`complete-${task.id}`}
            id={`label-complete-${task.id}`}
            className={cn(
              "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              isSubTask ? "text-xs" : "text-sm", 
              task.completed && "line-through",
              checkboxDisabled && "cursor-not-allowed opacity-70"
            )}
            style={textStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {task.completed ? "Mark Incomplete" : "Mark Complete"}
          </label>
        </div>
      </CardContent>
      <CardFooter className={cn(
        "flex justify-end space-x-0.5",
        isSubTask ? "p-2 pt-1 pb-1" : "p-3 pt-1" 
      )}>
         {isMainTask && isOwner && (
           <Popover open={isAddSubTaskPopoverOpen} onOpenChange={setIsAddSubTaskPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-5 w-5 p-0.5" : "h-7 w-7")}
                style={{color: textColor}}
                aria-label="Add sub-task"
                onClick={(e) => e.stopPropagation()} 
              >
                <PlusCircleIcon className={isSubTask ? "h-3 w-3" : "h-4 w-4"} />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="p-0 w-auto" 
                side="bottom" 
                align="end"
                onClick={(e) => e.stopPropagation()} // Prevent card drag/click
            >
              <AddSubTaskForm 
                parentId={task.id} 
                onAddTask={onAddTask} 
                onSubTaskAdded={() => setIsAddSubTaskPopoverOpen(false)}
              />
            </PopoverContent>
          </Popover>
        )}
        <Button
          variant="ghost"
          size={isSubTask ? "icon" : "icon"} 
          onClick={(e) => { e.stopPropagation(); onPrint(task);}}
          className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-5 w-5 p-0.5" : "h-7 w-7")}
          style={{color: textColor}}
          aria-label="Print task"
        >
          <PrinterIcon className={isSubTask ? "h-3 w-3" : "h-4 w-4"} />
        </Button>
        {isOwner && (
            <Button
            variant="ghost"
            size={isSubTask ? "icon" : "icon"} 
            onClick={(e) => { e.stopPropagation(); onDelete(task);}}
            className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-5 w-5 p-0.5" : "h-7 w-7")}
            style={{color: textColor}}
            aria-label="Delete task"
            >
            <Trash2Icon className={isSubTask ? "h-3 w-3" : "h-4 w-4"} />
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}
