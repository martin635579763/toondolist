
"use client";

import type { Task } from "@/types/task";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, Link2Icon, GitForkIcon, ListChecks, CircleDot, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { cn, getContrastingTextColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";


interface TaskCardProps {
  task: Task;
  allTasks: Task[]; // For resolving parent/child relationships
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onPrint: (task: Task) => void;
}

export function TaskCard({ task, allTasks, onToggleComplete, onDelete, onPrint }: TaskCardProps) {
  const textColor = getContrastingTextColor(task.color);
  const isSubTask = !!task.parentId;

  const parentTask = task.parentId ? allTasks.find(t => t.id === task.parentId) : null;
  const childTasks = allTasks.filter(t => t.parentId === task.id);

  const cardStyle = {
    backgroundColor: task.color,
    color: textColor,
    borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
    marginLeft: isSubTask ? '2rem' : '0', 
    borderLeftWidth: isSubTask ? '4px' : undefined, // This acts as part of the "polyline"
    borderLeftColor: isSubTask ? (parentTask ? parentTask.color : 'hsl(var(--primary))') : undefined,
  };
  
  const textStyle = { color: textColor };
  const mutedTextStyle = { color: textColor, opacity: 0.8 };
  const veryMutedTextStyle = { color: textColor, opacity: 0.6 };


  return (
    <Card
      className={cn(
        "flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 relative",
        task.completed && "opacity-60 ring-2 ring-green-500",
        isSubTask && "min-w-[250px]" // ensure subtasks have a min-width
      )}
      style={cardStyle}
    >
      {isSubTask && (
         <GitForkIcon 
            className="absolute top-2.5 left-[-12px] h-4 w-4 transform -translate-x-1/2 rotate-90" // Adjusted size and position
            style={{ color: parentTask ? parentTask.color : 'hsl(var(--primary))', strokeWidth: 2.5 }}
            aria-hidden="true"
          />
      )}
      <CardHeader className={cn(
        isSubTask ? "p-2 pb-1" : "p-6 pb-3" // Reduced padding for sub-tasks
      )}>
        <div className="flex items-start justify-between">
          <CardTitle className={cn(
            "font-bold break-words", 
            isSubTask ? "text-base" : "text-2xl" // Adjusted font size for sub-task title
          )} style={textStyle}>
            {task.title}
          </CardTitle>
          {task.completed && <PartyPopperIcon className={cn("ml-2 shrink-0", isSubTask ? "h-4 w-4": "h-8 w-8" )} style={{color: textColor === '#FFFFFF' ? '#FFFF00' : '#FFD700'}} />}
        </div>
        {parentTask && (
          <Badge variant="outline" className="mt-0.5 text-xs py-0 px-1 w-fit" style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: textColor }}>
            <Link2Icon className="mr-1 h-2.5 w-2.5" />
            Parent: {parentTask.title.length > (isSubTask ? 10 : 20) ? parentTask.title.substring(0, (isSubTask ? 7 : 17)) + '...' : parentTask.title}
          </Badge>
        )}
        {task.description && (
          <CardDescription className={cn(
            "mt-1 break-words", 
            isSubTask ? "text-xs leading-tight max-h-10 overflow-y-auto" : "text-sm" // Reduced font size, tighter leading for sub-task description
          )} style={{color: textColor, opacity: 0.85}}>
            {isSubTask && task.description.length > 50 ? task.description.substring(0, 47) + "..." : task.description}
            {!isSubTask && task.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={cn(
        "flex-grow space-y-1 pt-0 pb-2", 
        isSubTask ? "p-2 pt-1 pb-1 space-y-0.5" : "p-6 pt-0 space-y-2" // Reduced padding and spacing for sub-tasks
      )}>
        {task.dueDate && (
          <div className={cn("flex items-center", isSubTask ? "text-xs" : "text-sm")} style={{color: textColor, opacity: 0.9}}>
            <CalendarDaysIcon className={cn("mr-1", isSubTask ? "h-3 w-3" : "h-3.5 w-3.5")} style={textStyle} /> {/* Slightly smaller icon for sub-task */}
            Due: {format(new Date(task.dueDate), "PP")} {/* Shorter date format for sub-tasks */}
          </div>
        )}

        {!isSubTask && childTasks.length > 0 && (
           <div className="mt-2 pt-2 border-t border-dashed" style={{borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}}>
            <h4 className="text-xs font-semibold uppercase flex items-center mb-1" style={mutedTextStyle}>
              <ListChecks className="mr-1.5 h-3.5 w-3.5" />
              {childTasks.length} Sub-task(s)
            </h4>
            <ul className="list-none pl-1 space-y-0.5">
              {childTasks.slice(0, 3).map(st => {
                const subTaskFull = allTasks.find(t => t.id === st.id);
                return (
                  <li key={st.id} className="text-xs flex items-center" style={veryMutedTextStyle}>
                    {subTaskFull?.completed ? <CheckCircle2 className="mr-1.5 h-3 w-3 text-green-400 opacity-90" /> : <CircleDot className="mr-1.5 h-3 w-3 opacity-70" />}
                    <span className={cn(subTaskFull?.completed && "line-through")}>{st.title.length > 30 ? st.title.substring(0,27) + "..." : st.title}</span>
                  </li>
                );
              })}
              {childTasks.length > 3 && <li className="text-xs pl-1" style={veryMutedTextStyle}>...and {childTasks.length - 3} more.</li>}
            </ul>
          </div>
        )}

        <div className={cn("flex items-center space-x-2", isSubTask ? "pt-1" : "pt-2")}>
          <Checkbox
            id={`complete-${task.id}`}
            checked={task.completed}
            onCheckedChange={() => onToggleComplete(task.id)}
            className={cn(
              "border-2 rounded data-[state=checked]:bg-green-500 data-[state=checked]:text-white",
              isSubTask ? "h-3.5 w-3.5" : "h-5 w-5",  // Smaller checkbox for sub-tasks
              textColor === '#FFFFFF' ? "border-white/70" : "border-black/50"
            )}
            style={{ borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}
            aria-labelledby={`label-complete-${task.id}`}
          />
          <label
            htmlFor={`complete-${task.id}`}
            id={`label-complete-${task.id}`}
            className={cn(
              "font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              isSubTask ? "text-xs" : "text-sm", // Smaller label for sub-tasks
              task.completed && "line-through"
            )}
            style={textStyle}
          >
            {task.completed ? "Mark Incomplete" : "Mark Complete"}
          </label>
        </div>
      </CardContent>
      <CardFooter className={cn(
        "flex justify-end space-x-1", 
        isSubTask ? "p-1 pt-0" : "p-6 pt-0 space-x-2" // Reduced padding and spacing for sub-task footer
      )}>
        <Button
          variant="ghost"
          size="icon" 
          onClick={() => onPrint(task)}
          className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-6 w-6" : "h-8 w-8")} // Smaller button for sub-tasks
          style={{color: textColor}}
          aria-label="Print task"
        >
          <PrinterIcon className={isSubTask ? "h-3 w-3" : "h-5 w-5"} /> {/* Smaller icon for sub-tasks */}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(task.id)}
          className={cn("hover:bg-white/20 dark:hover:bg-black/20", isSubTask ? "h-6 w-6" : "h-8 w-8")} // Smaller button for sub-tasks
          style={{color: textColor}}
          aria-label="Delete task"
        >
          <Trash2Icon className={isSubTask ? "h-3 w-3" : "h-5 w-5"} /> {/* Smaller icon for sub-tasks */}
        </Button>
      </CardFooter>
    </Card>
  );
}

