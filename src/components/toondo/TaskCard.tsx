
"use client";

import type { Task, Applicant } from "@/types/task";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, Link2Icon, ListChecks, CircleDot, CheckCircle2, ArrowRightIcon, PencilIcon, InfoIcon, UsersIcon, UserCheckIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, getContrastingTextColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect, useRef } from 'react';


interface TaskCardProps {
  task: Task;
  allTasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (task: Task) => void;
  onPrint: (task: Task) => void;
  onEdit: (task: Task) => void;
  isDraggingSelf: boolean;
  isDragOverSelf: boolean;
  isMainTaskWithIncompleteSubtasks: boolean;
}

export function TaskCard({
  task,
  allTasks,
  onToggleComplete,
  onDelete,
  onPrint,
  onEdit,
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

  // Removed specific left border styling for sub-tasks
  // if (isSubTask) {
  //   cardStyle.borderLeftWidth = '4px';
  //   cardStyle.borderLeftColor = '#000000'; // Hardcoded black polyline
  //   cardStyle.borderLeftStyle = 'solid';
  // }

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


  return (
    <Card
      className={cn(
        "flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 relative",
        task.completed && "opacity-60 ring-2 ring-green-500",
        isSubTask && "ml-8 max-w-sm", 
        isDraggingSelf && "opacity-50 ring-2 ring-primary ring-offset-2",
        isDragOverSelf && "ring-2 ring-primary ring-offset-1 scale-102 shadow-2xl z-10",
        !isDraggingSelf && isMainTask && "cursor-grab" 
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

      {/* Removed GitForkIcon for sub-tasks */}
      {/* {isSubTask && parentTask && (
         <GitForkIcon
            className="absolute top-2 left-[-12px] h-4 w-4 transform -translate-x-1/2 rotate-90" 
            stroke={'#000000'} // Hardcoded black
            strokeWidth={2.5}
            aria-hidden="true"
          />
      )} */}
      <CardHeader className={cn(
        isSubTask ? "p-1 pt-0.5 pb-0" : "p-6 pb-3" 
      )}>
        <div className="flex items-start justify-between">
          <CardTitle className={cn(
            "font-bold break-words",
            isSubTask ? "text-base" : "text-2xl" 
          )} style={textStyle}>
            {task.title}
          </CardTitle>
          {task.completed && <PartyPopperIcon className={cn("ml-1 shrink-0", isSubTask ? "h-3.5 w-3.5 mt-0.5": "h-8 w-8" )} style={{color: textColor === '#FFFFFF' ? '#FFFF00' : '#FFD700'}} />}
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
            <div className="flex flex-col gap-1 text-xs">
              {task.assignedRoles.map((role, index) => {
                const acceptedApplicant = task.applicants?.find(app => app.role === role && app.status === 'accepted');
                const pendingApplicants = task.applicants?.filter(app => app.role === role && app.status === 'pending') || [];
                return (
                  <div key={index} className="flex items-center" style={textStyle}>
                    <span className="mr-1.5">- {role}:</span>
                    {acceptedApplicant ? (
                      <Badge variant="default" className="py-0 px-1.5 text-[10px] bg-green-500/80 hover:bg-green-500 text-white">
                        <UserCheckIcon className="h-3 w-3 mr-1"/> Filled by {acceptedApplicant.name}
                      </Badge>
                    ) : pendingApplicants.length > 0 ? (
                       <Badge variant="secondary" className="py-0 px-1.5 text-[10px]">
                        <ClockIcon className="h-3 w-3 mr-1"/> {pendingApplicants.length} pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="py-0 px-1.5 text-[10px]" style={{borderColor: textColor, color: textColor}}>
                        Open
                      </Badge>
                    )}
                  </div>
                );
              })}
               {(task.applicants?.length || 0) > 0 && (
                <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" style={{color: textColor}} onClick={(e) => { e.stopPropagation(); onEdit(task); }}>
                    Manage Applicants...
                </Button>
              )}
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
                      className="ml-2 h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      stroke={"#000000"} // Hardcoded black
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

