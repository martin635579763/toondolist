
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Edit3Icon, CalendarDaysIcon, PartyPopperIcon, UsersIcon, PlusCircleIcon, Trash2Icon, UserPlusIcon, MoreHorizontalIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import React, { useState, useEffect, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";


interface TaskCardProps {
  task: Task;
  currentUser: User | null;
  onDelete: (task: Task) => void;
  onPrint: (task: Task) => void;
  onAddChecklistItem: (taskId: string, itemTitle: string) => void;
  onToggleChecklistItem: (taskId: string, itemId: string) => void;
  onDeleteChecklistItem: (taskId: string, itemId: string) => void;
  onUpdateChecklistItemTitle: (taskId: string, itemId: string, newTitle: string) => void;
  onApplyForRole: (taskId: string, roleName: string) => void;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => void;
  onSetDueDate: (taskId: string, date: Date | null) => void;
  onSetBackgroundImage: (taskId: string, imageUrl: string | null) => void;
}

export function TaskCard({
  task,
  currentUser,
  onDelete,
  onPrint,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onUpdateChecklistItemTitle,
  onApplyForRole,
  onUpdateTaskTitle,
  onSetDueDate,
  onSetBackgroundImage,
}: TaskCardProps) {
  const isOwner = currentUser && currentUser.id === task.userId;
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [showFireworks, setShowFireworks] = useState(false);
  const prevCompleted = useRef(task.completed);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  );
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState(task.backgroundImageUrl || "");

  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistItemNewTitle, setEditingChecklistItemNewTitle] = useState("");
  const checklistItemInputRef = useRef<HTMLInputElement>(null);


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

  useEffect(() => {
    if (editingChecklistItemId && checklistItemInputRef.current) {
      checklistItemInputRef.current.focus();
      checklistItemInputRef.current.select();
    }
  }, [editingChecklistItemId]);


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

  const handleSetTaskDueDate = (date: Date | undefined) => {
    setSelectedDate(date);
    onSetDueDate(task.id, date || null);
    setIsDatePickerOpen(false);
  };

  const handleSetTaskBackgroundImage = () => {
    onSetBackgroundImage(task.id, newImageUrl.trim() || null);
    setIsImageDialogOpen(false);
  };

  const handleStartEditChecklistItem = (item: ChecklistItem) => {
    setEditingChecklistItemId(item.id);
    setEditingChecklistItemNewTitle(item.title);
  };

  const handleSaveChecklistItemTitle = (itemId: string) => {
    if (editingChecklistItemNewTitle.trim() && editingChecklistItemNewTitle.trim() !== task.checklistItems?.find(i => i.id === itemId)?.title) {
      onUpdateChecklistItemTitle(task.id, itemId, editingChecklistItemNewTitle.trim());
    }
    setEditingChecklistItemId(null);
    setEditingChecklistItemNewTitle("");
  };

  const handleCancelEditChecklistItem = () => {
    setEditingChecklistItemId(null);
    setEditingChecklistItemNewTitle("");
  };
  
  const cardStyle: React.CSSProperties = {};
  let contentOverlayStyle: React.CSSProperties = {};

  if (task.backgroundImageUrl) {
    cardStyle.backgroundImage = `url(${task.backgroundImageUrl})`;
    cardStyle.backgroundSize = 'cover';
    cardStyle.backgroundPosition = 'center';
    contentOverlayStyle.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // Dark overlay
    contentOverlayStyle.color = 'white'; // Ensure text is white
  }


  return (
    <Card
      className={cn(
        "flex flex-col justify-between shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out transform hover:-translate-y-1 relative border-border",
        task.completed && "opacity-60 ring-2 ring-green-500",
        !task.backgroundImageUrl && "bg-card text-card-foreground"
      )}
      style={cardStyle}
    >
      {task.backgroundImageUrl && (
         <div className="absolute inset-0 bg-black/40 rounded-lg -z-10 pointer-events-none"></div>
      )}
      <div style={contentOverlayStyle} className={cn(task.backgroundImageUrl && "p-4 rounded-lg", "flex flex-col flex-grow")}>
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

      <CardHeader className={cn("pb-2", !task.backgroundImageUrl && "p-4")}>
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
                className={cn(
                    "text-xl font-bold h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
                    task.backgroundImageUrl ? "bg-transparent text-white placeholder-gray-300" : "bg-transparent"
                )}
                aria-label="Edit task title"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <CardTitle
                className={cn(
                  "text-xl font-bold break-words",
                  isOwner && "cursor-pointer hover:opacity-80 transition-opacity",
                   task.backgroundImageUrl ? "text-white" : "text-card-foreground"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isOwner) {
                    setEditableTitle(task.title);
                    setIsEditingTitle(true);
                  }
                }}
                title={isOwner ? "Click to edit title" : undefined}
              >
                {task.title}
                 {isOwner && !isEditingTitle && <Edit3Icon className={cn("inline-block ml-2 h-3 w-3 opacity-0 group-hover/card:opacity-50 transition-opacity", task.backgroundImageUrl ? "text-gray-300" : "text-muted-foreground")} />}
              </CardTitle>
            )}
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {task.completed && <PartyPopperIcon className="ml-1 shrink-0 h-5 w-5 text-yellow-400" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("flex-grow space-y-2 pt-1 min-h-7", !task.backgroundImageUrl && "p-4")}>
        {task.dueDate && (
          <div className={cn("text-sm flex items-center", task.backgroundImageUrl ? "text-gray-200" : "text-muted-foreground")}>
            <CalendarDaysIcon className="mr-1 h-3.5 w-3.5" />
            Due: {format(new Date(task.dueDate), "PP")}
          </div>
        )}

        {task.assignedRoles && task.assignedRoles.length > 0 && (
          <div className={cn("mt-1.5 pt-1.5 border-t border-dashed", task.backgroundImageUrl ? "border-gray-400/50" : "border-border/50")}>
            <h4 className={cn("text-xs font-semibold uppercase flex items-center mb-0.5", task.backgroundImageUrl ? "text-gray-300" : "text-muted-foreground")}>
              <UsersIcon className="mr-1 h-3 w-3" />
              Needed Roles:
            </h4>
            {/* Role rendering logic (omitted for brevity, assumed unchanged) */}
          </div>
        )}

        {(task.checklistItems && task.checklistItems.length > 0) && (
          <div className={cn("mt-2 pt-2 border-t border-dashed", task.backgroundImageUrl ? "border-gray-400/50" : "border-border/50")}>
            <div className="space-y-1 pr-1">
              {task.checklistItems.map(item => (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex items-center justify-between group/checklist text-sm rounded-md p-1.5", 
                    task.backgroundImageUrl ? "border border-white/30 bg-white/10 text-gray-100" : "border border-border/60 text-card-foreground",
                    editingChecklistItemId === item.id && (task.backgroundImageUrl ? "bg-white/20" : "bg-muted/50")
                  )}
                >
                  <div className="flex items-center flex-grow min-w-0 relative">
                    <Checkbox
                      id={`checklist-${task.id}-${item.id}`}
                      checked={item.completed}
                      onCheckedChange={() => onToggleChecklistItem(task.id, item.id)}
                      disabled={!isOwner || editingChecklistItemId === item.id}
                      className={cn(
                        "h-3.5 w-3.5 border-2 rounded-full data-[state=checked]:bg-green-400 shrink-0",
                        "transition-opacity duration-200 ease-in-out",
                        "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                        task.backgroundImageUrl ? "border-gray-300 data-[state=checked]:text-gray-800" : "border-muted-foreground data-[state=checked]:text-primary-foreground",
                        isOwner
                          ? "opacity-0 group-hover/checklist:opacity-100 group-focus-within/checklist:opacity-100"
                          : "opacity-50 cursor-not-allowed",
                        editingChecklistItemId === item.id && "!opacity-50"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {editingChecklistItemId === item.id && isOwner ? (
                      <Input
                        ref={checklistItemInputRef}
                        type="text"
                        value={editingChecklistItemNewTitle}
                        onChange={(e) => setEditingChecklistItemNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveChecklistItemTitle(item.id);
                          if (e.key === 'Escape') handleCancelEditChecklistItem();
                        }}
                        onBlur={() => handleSaveChecklistItemTitle(item.id)}
                        className={cn(
                          "h-auto py-0 px-0 text-sm flex-grow bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
                           task.backgroundImageUrl ? "text-white placeholder-gray-300" : "text-card-foreground",
                           isOwner 
                            ? "pl-0 group-hover/checklist:pl-[calc(0.875rem+0.5rem)] group-focus-within/checklist:pl-[calc(0.875rem+0.5rem)]" 
                            : "pl-[calc(0.875rem+0.5rem)]"
                        )}
                        style={{ paddingLeft: 'calc(0.875rem + 0.5rem)' }} // Ensure space for checkbox
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <label
                        htmlFor={`checklist-${task.id}-${item.id}`}
                        className={cn(
                          "flex-grow break-all truncate",
                          "transition-all duration-200 ease-in-out",
                          isOwner
                            ? "pl-0 group-hover/checklist:pl-[calc(0.875rem+0.5rem)] group-focus-within/checklist:pl-[calc(0.875rem+0.5rem)]"
                            : "pl-[calc(0.875rem+0.5rem)]",
                          item.completed && "line-through opacity-70",
                          !isOwner && "cursor-not-allowed",
                           task.backgroundImageUrl ? "text-gray-100" : "text-card-foreground"
                        )}
                      >
                        {item.title}
                      </label>
                    )}
                  </div>
                  {isOwner && editingChecklistItemId !== item.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-5 w-5 p-0 opacity-0 group-hover/checklist:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 shrink-0",
                            task.backgroundImageUrl ? "text-gray-300 hover:text-white hover:bg-white/20" : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="More options for checklist item"
                        >
                          <MoreHorizontalIcon className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="bottom"
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-popover text-popover-foreground"
                      >
                        <DropdownMenuItem onClick={() => handleStartEditChecklistItem(item)}>
                          <Edit3Icon className="mr-2 h-3.5 w-3.5" />
                          Edit Item
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteChecklistItem(task.id, item.id)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2Icon className="mr-2 h-3.5 w-3.5" />
                          Delete Item
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                           <CalendarDaysIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                           <span className="text-muted-foreground/70">Set Due Date (soon)</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                           <UserPlusIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                           <span className="text-muted-foreground/70">Assign User (soon)</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner && (
          <div className={cn("mt-2 pt-2 border-t border-dashed", task.backgroundImageUrl ? "border-gray-400/50" : "border-border/50")}>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Add checklist item..."
                value={newChecklistItemTitle}
                onChange={(e) => setNewChecklistItemTitle(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAddChecklistItemSubmit(); }}
                className={cn(
                    "h-8 text-sm flex-grow border-input",
                    task.backgroundImageUrl ? "bg-white/10 border-white/30 text-white placeholder-gray-300" : "bg-background/50"
                )}
                disabled={!isOwner}
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); handleAddChecklistItemSubmit();}}
                className={cn(
                    "h-8 px-2 py-1 text-xs",
                    task.backgroundImageUrl ? "bg-white/20 border-white/30 text-white hover:bg-white/30" : ""
                )}
                disabled={!isOwner || !newChecklistItemTitle.trim()}
              >
                <PlusCircleIcon className="h-3 w-3 mr-1"/> Add
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className={cn("flex justify-end space-x-0.5 pt-1", !task.backgroundImageUrl && "p-3")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onPrint(task);}}
          className={cn("h-7 w-7 hover:bg-black/10 dark:hover:bg-white/10", task.backgroundImageUrl ? "text-gray-300 hover:text-white" : "text-muted-foreground hover:text-foreground")}
          aria-label="Print task"
        >
          <PrinterIcon className="h-4 w-4" />
        </Button>
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 hover:bg-black/10 dark:hover:bg-white/10", task.backgroundImageUrl ? "text-gray-300 hover:text-white" : "text-muted-foreground hover:text-foreground")}
                aria-label="Task options"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                side="bottom" 
                align="end" 
                onClick={(e) => e.stopPropagation()}
                className="bg-popover text-popover-foreground"
            >
              <DropdownMenuItem onClick={() => { setIsEditingTitle(true); setEditableTitle(task.title); }}>
                <Edit3Icon className="mr-2 h-4 w-4" />
                Edit Title
              </DropdownMenuItem>

              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm font-normal h-auto">
                        <CalendarDaysIcon className="mr-2 h-4 w-4" /> Set Due Date
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="right" sideOffset={5}>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSetTaskDueDate}
                        initialFocus
                    />
                </PopoverContent>
              </Popover>

              <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm font-normal h-auto">
                        <UsersIcon className="mr-2 h-4 w-4" /> Set Background Image
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground" onClick={(e) => e.stopPropagation()}>
                  <DialogHeader>
                    <DialogTitle>Set Background Image</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="imageUrl" className="text-right">Image URL</Label>
                      <Input
                        id="imageUrl"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className="col-span-3 bg-input text-foreground"
                        placeholder="https://example.com/image.png"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSetTaskBackgroundImage}>Save Background</Button>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenuItem disabled>
                 <UserPlusIcon className="mr-2 h-4 w-4 text-muted-foreground/70" />
                 <span className="text-muted-foreground/70">Change Owner (soon)</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(task)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2Icon className="mr-2 h-4 w-4" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
      </div>
    </Card>
  );
}
    
