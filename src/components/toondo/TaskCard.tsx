
"use client";

import type { Task } from "@/types/task";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, Link2Icon, GitForkIcon, ListChecks, CircleDot, CheckCircle2, ArrowRightIcon, PencilIcon, InfoIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, getContrastingTextColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface TaskCardProps {
  task: Task;
  allTasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onPrint: (task: Task) => void;
  onEdit: (task: Task) => void;
  isDraggingSelf: boolean;
  isDragOverSelf: boolean;
  isMainTaskWithIncompleteSubtasks: boolean; // New prop
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
  const childTasks = allTasks.filter(t => t.parentId === task.id); // All children, not just incomplete

  const polylineColor = "#000000"; 

  const cardStyle: React.CSSProperties = {
    backgroundColor: task.color,
    color: textColor,
    borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
  };

  if (isSubTask) {
    cardStyle.borderLeftWidth = '4px';
    cardStyle.borderLeftColor = polylineColor; 
    cardStyle.borderLeftStyle = 'solid';
  }

  const textStyle = { color: textColor };
  const mutedTextStyle = { color: textColor, opacity: 0.8 };
  const veryMutedTextStyle = { color: textColor, opacity: 0.6 };

  const checkboxDisabled = isMainTask && isMainTaskWithIncompleteSubtasks && !task.completed;

  return (
    <Card
      className={cn(
        "flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 relative",
        task.completed && "opacity-60 ring-2 ring-green-500",
        isSubTask && "ml-8 max-w-sm", 
        isDraggingSelf && "opacity-50 ring-2 ring-primary ring-offset-2",
        isDragOverSelf && "ring-2 ring-primary ring-offset-1 scale-102 shadow-2xl z-10",
        !isDraggingSelf && !isSubTask && "group-hover:cursor-grab" 
      )}
      style={cardStyle}
    >
      {isSubTask && parentTask && (
         <GitForkIcon
            className="absolute top-2 left-[-12px] h-4 w-4 transform -translate-x-1/2 rotate-90"
            stroke={polylineColor} 
            strokeWidth={2.5}
            aria-hidden="true"
          />
      )}
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
          <Badge variant="outline" className="mt-0.5 text-sm py-0 px-0.5 w-fit leading-tight" style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: textColor }}> 
            <Link2Icon className="mr-0.5 h-2.5 w-2.5" /> 
            Parent: {parentTask.title.length > 15 ? parentTask.title.substring(0, 12) + '...' : parentTask.title}
          </Badge>
        )}
        {task.description && (isSubTask ? (
            <CardDescription className={cn("mt-0.5 break-words text-sm leading-snug max-h-10 overflow-y-auto")} style={{color: textColor, opacity: 0.85}}> 
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
                      stroke={"#000000"} 
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
            <TooltipTrigger asChild disabled={!checkboxDisabled}>
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
          onClick={(e) => { e.stopPropagation(); onDelete(task.id);}}
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
