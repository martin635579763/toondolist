"use client";

import type { Task } from "@/types/task";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Trash2Icon, CalendarDaysIcon, PartyPopperIcon, PencilIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, getContrastingTextColor } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onPrint: (task: Task) => void;
}

export function TaskCard({ task, onToggleComplete, onDelete, onPrint }: TaskCardProps) {
  const textColor = getContrastingTextColor(task.color);
  const cardStyle = {
    backgroundColor: task.color,
    color: textColor,
    borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
  };
  
  // Custom style for child elements to ensure they inherit the correct text color
  const textStyle = { color: textColor };

  return (
    <Card
      className={cn(
        "flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1",
        task.completed && "opacity-60 ring-2 ring-green-500"
      )}
      style={cardStyle}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-2xl font-bold break-words" style={textStyle}>
            {task.title}
          </CardTitle>
          {task.completed && <PartyPopperIcon className="h-8 w-8 ml-2 shrink-0" style={{color: textColor === '#FFFFFF' ? '#FFFF00' : '#FFD700'}} />}
        </div>
        {task.description && (
          <CardDescription className="mt-1 text-sm break-words" style={{color: textColor, opacity: 0.85}}>
            {task.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-0 pb-4">
        {task.dueDate && (
          <div className="flex items-center text-sm" style={{color: textColor, opacity: 0.9}}>
            <CalendarDaysIcon className="mr-2 h-4 w-4" style={textStyle} />
            Due: {format(new Date(task.dueDate), "PPP")}
          </div>
        )}
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`complete-${task.id}`}
            checked={task.completed}
            onCheckedChange={() => onToggleComplete(task.id)}
            className={cn(
              "border-2 rounded data-[state=checked]:bg-green-500 data-[state=checked]:text-white",
              textColor === '#FFFFFF' ? "border-white/70" : "border-black/50"
            )}
            style={{ borderColor: textColor === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }}
            aria-labelledby={`label-complete-${task.id}`}
          />
          <label
            htmlFor={`complete-${task.id}`}
            id={`label-complete-${task.id}`}
            className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              task.completed && "line-through"
            )}
            style={textStyle}
          >
            {task.completed ? "Mark as Incomplete" : "Mark as Complete"}
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 pt-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onPrint(task)}
          className="hover:bg-white/20 dark:hover:bg-black/20"
          style={{color: textColor}}
          aria-label="Print task"
        >
          <PrinterIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(task.id)}
          className="hover:bg-white/20 dark:hover:bg-black/20"
          style={{color: textColor}}
          aria-label="Delete task"
        >
          <Trash2Icon className="h-5 w-5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
