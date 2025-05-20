
"use client";

import type { Task, Applicant } from "@/types/task";
import type { User } from "@/types/user"; // Ensure User type is imported
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, Link2Icon, ListChecks, CircleDot, CheckCircle2, ArrowRightIcon, PencilIcon, InfoIcon, UsersIcon, UserCheckIcon, ClockIcon, UserPlusIcon as ApplyIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, getContrastingTextColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface TaskCardProps {
  task: Task;
  allTasks: Task[];
  currentUser: User | null;
  onToggleComplete: (id: string) => void;
  onDelete: (task: Task) => void;
  onPrint: (task: Task) => void;
  onEdit: (task: Task) => void;
  onApplyForRole: (taskId: string, roleName: string) => void;
  isDraggingSelf: boolean;
  isDragOverSelf: boolean;
  isMainTaskWithIncompleteSubtasks: boolean;
}

export function TaskCard({
  task,
  allTasks,
  currentUser,
  onToggleComplete,
  onDelete,
  onPrint,
  onEdit,
  onApplyForRole,
  isDraggingSelf,
  isDragOverSelf,
  isMainTaskWithIncompleteSubtasks
}: TaskCardProps) {
  const textColor = getContrastingTextColor(task.color);
  const isSubTask = !!task.parentId;
  const isMainTask = !task.parentId;

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

  const checkboxDisabled = isMainTask && isMainTaskWithIncompleteSubtasks && !task.completed;

  const [showFireworks, setShowFireworks] = useState(false);
  const prevCompleted = useRef(task.completed);

  useEffect(() => {
    if (task.completed && !prevCompleted.current && isMainTask) { 
      setShowFireworks(true);
      const timer = setTimeout(() => setShowFireworks(false), 4000); 
      return () => clearTimeout(timer); 
    }
    prevCompleted.current = task.completed;
  }, [task.completed, isMainTask]);

  // Helper to get all users from localStorage, specific to this component's needs for applicant avatars
  const getAllUsersFromStorage = (): User[] => {
    if (typeof window !== 'undefined') {
      const storedUsers = localStorage.getItem('toondo-users'); // Key used in AuthContext
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
        isSubTask && "ml-8 max-w-sm", 
        isDraggingSelf && "opacity-50 ring-2 ring-primary ring-offset-2",
        isDragOverSelf && "ring-2 ring-primary ring-offset-1 scale-102 shadow-2xl z-10",
        !isDraggingSelf && isMainTask && currentUser && task.userId === currentUser.id && "cursor-grab" // Only owner can drag main task
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
        isSubTask ? "p-1 pt-0.5 pb-0" : "p-6 pb-3" 
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <CardTitle className={cn(
              "font-bold break-words",
              isSubTask ? "text-base" : "text-2xl" // Title size for sub-tasks
            )} style={textStyle}>
              {task.title}
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {isMainTask && task.userAvatarUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 border-2" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'}}>
                      <AvatarImage src={task.userAvatarUrl} alt={task.userDisplayName} data-ai-hint="user portrait"/>
                      <AvatarFallback style={{backgroundColor: task.color, color: textColor, borderStyle: 'solid', borderWidth: '1px', borderColor: textColor}}>
                          {task.userDisplayName?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Quest Giver: {task.userDisplayName}</p>
                </TooltipContent>
              </Tooltip>
            )}
            {task.completed && <PartyPopperIcon className={cn("ml-1 shrink-0", isSubTask ? "h-3.5 w-3.5 mt-0.5": "h-8 w-8" )} style={{color: textColor === '#FFFFFF' ? '#FFFF00' : '#FFD700'}} />}
          </div>
        </div>

        {parentTask && isSubTask && (
          <Badge variant="outline" className={cn("mt-0.5 py-0 px-0.5 w-fit leading-tight", isSubTask ? "text-sm" : "text-sm")} style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: textColor }}>
            <Link2Icon className="mr-0.5 h-2.5 w-2.5" />
            Parent: {parentTask.title.length > 15 ? parentTask.title.substring(0, 12) + '...' : parentTask.title}
          </Badge>
        )}
        {task.description && (isSubTask ? (
            <CardDescription className={cn("mt-0.5 break-words leading-snug max-h-10 overflow-y-auto", isSubTask ? "text-sm" : "text-sm")} style={{color: textColor, opacity: 0.85}}>
                {task.description.length > 50 ? task.description.substring(0, 47) + "..." : task.description}
            </CardDescription>
        ) : (
            <CardDescription className={cn("mt-1 break-words text-sm")} style={{color: textColor, opacity: 0.85}}>
                {task.description}
            </CardDescription>
        ))}
      </CardHeader>
      <CardContent className={cn(
        "flex-grow space-y-0.5 pt-0 min-h-7", 
        isSubTask ? "p-1 pt-0.5 pb-0 space-y-0" : "p-6 pt-0 space-y-2" 
      )}>
        {task.dueDate && (
          <div className={cn("flex items-center", isSubTask ? "text-sm" : "text-sm")} style={{color: textColor, opacity: 0.9}}>
            <CalendarDaysIcon className={cn("mr-0.5", isSubTask ? "h-3.5 w-3.5" : "h-3.5 w-3.5")} style={textStyle} />
            Due: {format(new Date(task.dueDate), "PP")}
          </div>
        )}

        {isMainTask && task.assignedRoles && task.assignedRoles.length > 0 && (
          <div className="mt-2 pt-2 border-t border-dashed" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}}>
            <h4 className="text-xs font-semibold uppercase flex items-center mb-1" style={mutedTextStyle}>
              <UsersIcon className="mr-1.5 h-3.5 w-3.5" />
              Needed Roles:
            </h4>
            <div className="flex flex-col gap-1.5 text-xs">
              {task.assignedRoles.map((role, index) => {
                const acceptedApplicant = task.applicants?.find(app => app.role === role && app.status === 'accepted');
                const currentUserApplication = currentUser ? task.applicants?.find(app => app.role === role && app.applicantUserId === currentUser.id) : null;
                const pendingApplicantsCount = task.applicants?.filter(app => app.role === role && app.status === 'pending' && (!currentUser || app.applicantUserId !== currentUser.id)).length || 0;
                const totalPendingForRole = task.applicants?.filter(app => app.role === role && app.status === 'pending').length || 0;


                return (
                  <div key={index} className="flex items-center justify-between" style={textStyle}>
                    <span className="mr-1.5">- {role}:</span>
                    {acceptedApplicant ? (
                      <Badge variant="default" className="py-0 px-1.5 text-[10px] bg-green-500/80 hover:bg-green-500 text-white flex items-center gap-1">
                        <UserCheckIcon className="h-3 w-3"/>
                        {(() => {
                          if (!acceptedApplicant.applicantUserId) return acceptedApplicant.name; // Manual applicant
                          const allUsers = getAllUsersFromStorage();
                          const applicantUser = allUsers.find(u => u.id === acceptedApplicant.applicantUserId);
                          if (applicantUser) {
                            return (
                              <>
                                {applicantUser.avatarUrl && (
                                  <Avatar className="h-4 w-4 border-white/50">
                                    <AvatarImage src={applicantUser.avatarUrl} alt={applicantUser.displayName} data-ai-hint="user portrait"/>
                                    <AvatarFallback className="text-[8px] bg-transparent text-white">
                                      {applicantUser.displayName?.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                {applicantUser.displayName}
                              </>
                            );
                          }
                          return acceptedApplicant.name; // Fallback if user details not found
                        })()}
                      </Badge>
                    ) : currentUserApplication ? ( // Current user has applied for this role
                       <Badge variant={currentUserApplication.status === 'pending' ? 'secondary' : 'destructive'} className="py-0 px-1.5 text-[10px]">
                         <ClockIcon className="h-3 w-3 mr-1"/> Applied ({currentUserApplication.status})
                       </Badge>
                    ) : ( // Role is open for the current user to apply for, or has other pending applicants
                      <div className="flex items-center gap-1">
                        {totalPendingForRole > 0 && (
                           <Badge variant="secondary" className="py-0 px-1.5 text-[10px]">
                             {totalPendingForRole} Pending
                           </Badge>
                        )}
                        {currentUser && task.userId === currentUser.id && totalPendingForRole > 0 && (
                             <Button
                                variant="link"
                                size="sm"
                                className="h-auto px-1 py-0 text-[10px] underline"
                                style={{color: textColor}}
                                onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                             >
                                Manage
                             </Button>
                        )}
                        {currentUser && task.userId !== currentUser.id && !currentUserApplication && ( // Current user can apply
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 px-1.5 py-0 text-[10px]" 
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.15)', 
                              borderColor: textColor, 
                              color: textColor,
                              lineHeight: 'normal'
                            }}
                            onClick={(e) => { e.stopPropagation(); onApplyForRole(task.id, role); }}
                          >
                            <ApplyIcon className="h-3 w-3 mr-0.5"/> Apply
                          </Button>
                        )}
                        {!currentUser && totalPendingForRole === 0 && ( // Not logged in, no pending
                            <Badge variant="outline" className="py-0 px-1.5 text-[10px]" style={{borderColor: textColor, color: textColor}}>
                                Open
                            </Badge>
                        )}
                         {currentUser && task.userId === currentUser.id && totalPendingForRole === 0 && ( // Owner, no pending
                             <Badge variant="outline" className="py-0 px-1.5 text-[10px]" style={{borderColor: textColor, color: textColor}}>
                                Open (Your Task)
                            </Badge>
                        )}
                         {currentUser && task.userId !== currentUser.id && totalPendingForRole > 0 && !currentUserApplication && ( // Not owner, other pending, can't apply yet
                            <Badge variant="outline" className="py-0 px-1.5 text-[10px]" style={{borderColor: textColor, color: textColor}}>
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
           <div className="mt-2 pt-2 border-t border-dashed" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}}>
            <h4 className="text-xs font-semibold uppercase flex items-center mb-1" style={mutedTextStyle}>
              <ListChecks className="mr-1.5 h-3.5 w-3.5" />
              {childTasks.length} Sub-task(s)
            </h4>
            <ul className="list-none pl-1 space-y-0.5">
              {childTasks.slice(0, 3).map(st => {
                const subTaskFull = allTasks.find(t => t.id === st.id);
                return (
                  <li key={st.id} className="text-xs flex items-center justify-between group" style={veryMutedTextStyle}>
                    <div className="flex items-center">
                      {subTaskFull?.completed ? <CheckCircle2 className="mr-1.5 h-3 w-3 text-green-400 opacity-90" /> : <CircleDot className="mr-1.5 h-3 w-3 opacity-70" />}
                      <span className={cn(subTaskFull?.completed && "line-through", "truncate max-w-[150px] sm:max-w-[200px]")}>{st.title}</span>
                    </div>
                     <ArrowRightIcon
                      className="ml-2 h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      stroke="#000000"
                    />
                  </li>
                );
              })}
              {childTasks.length > 3 && <li className="text-xs pl-1" style={veryMutedTextStyle}>...and {childTasks.length - 3} more.</li>}
            </ul>
          </div>
        )}

        <div className={cn("flex items-center", isSubTask ? "pt-0.5 space-x-1" : "pt-2 space-x-2")}>
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
                    isSubTask ? "h-3.5 w-3.5" : "h-5 w-5", 
                    textColor === '#FFFFFF' ? "border-white/70" : "border-black/50",
                    checkboxDisabled && "cursor-not-allowed opacity-70"
                    )}
                    style={{ borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}
                    aria-labelledby={`label-complete-${task.id}`}
                />
            </TooltipTrigger>
            {checkboxDisabled && (
                <TooltipContent>
                    <p className="flex items-center text-xs"><InfoIcon className="h-3 w-3 mr-1.5"/>Complete all sub-tasks first.</p>
                </TooltipContent>
            )}
          </Tooltip>
          <label
            htmlFor={`complete-${task.id}`}
            id={`label-complete-${task.id}`}
            className={cn(
              "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              isSubTask ? "text-sm" : "text-sm", 
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
        isSubTask ? "p-1 pt-0.5 pb-0.5" : "p-6 pt-0 space-x-2" 
      )}>
        <Button
          variant="ghost"
          size={isSubTask ? "icon" : "icon"} 
          onClick={(e) => { e.stopPropagation(); onEdit(task);}}
          className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-6 w-6 p-1" : "h-8 w-8")}
          style={{color: textColor}}
          aria-label="Edit task"
        >
          <PencilIcon className={isSubTask ? "h-3.5 w-3.5" : "h-5 w-5"} />
        </Button>
        <Button
          variant="ghost"
          size={isSubTask ? "icon" : "icon"} 
          onClick={(e) => { e.stopPropagation(); onPrint(task);}}
          className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-6 w-6 p-1" : "h-8 w-8")}
          style={{color: textColor}}
          aria-label="Print task"
        >
          <PrinterIcon className={isSubTask ? "h-3.5 w-3.5" : "h-5 w-5"} />
        </Button>
        <Button
          variant="ghost"
          size={isSubTask ? "icon" : "icon"} 
          onClick={(e) => { e.stopPropagation(); onDelete(task);}}
          className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-6 w-6 p-1" : "h-8 w-8")}
          style={{color: textColor}}
          aria-label="Delete task"
        >
          <Trash2Icon className={isSubTask ? "h-3.5 w-3.5" : "h-5 w-5"} />
        </Button>
      </CardFooter>
    </Card>
  );
}

