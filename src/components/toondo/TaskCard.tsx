
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Edit3Icon, CalendarDaysIcon, PartyPopperIcon, PlusCircleIcon, Trash2Icon, UserPlusIcon, UserCircleIcon, ImagePlusIcon, Image as ImageIcon, UploadIcon, TrashIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";


interface TaskCardProps {
  task: Task;
  currentUser: User | null;
  onDelete: (task: Task) => void;
  onPrint: (task: Task) => void;
  onAddChecklistItem: (taskId: string, itemTitle: string) => void;
  onToggleChecklistItem: (taskId: string, itemId: string) => void;
  onDeleteChecklistItem: (taskId: string, itemId: string) => void;
  onUpdateChecklistItemTitle: (taskId: string, itemId: string, newTitle: string) => void;
  onSetChecklistItemDueDate: (taskId: string, itemId: string, date: Date | null) => void;
  onAssignUserToChecklistItem: (taskId: string, itemId: string, userId: string | null, userName: string | null, userAvatarUrl: string | null) => void;
  onSetChecklistItemImage: (taskId: string, itemId: string, imageUrl: string | null, imageAiHint: string | null) => void;
  onApplyForRole: (taskId: string, roleName: string) => void;
  onUpdateTaskTitle: (taskId: string, newTitle: string) => void;
  onSetDueDate: (taskId: string, date: Date | null) => void;
  onSetBackgroundImage: (taskId: string, imageUrl: string | null) => void;
}

const suggestedImages = [
  { src: 'https://placehold.co/300x200.png', alt: 'Desert Oasis placeholder', aiHint: 'desert oasis' },
  { src: 'https://placehold.co/250x150.png', alt: 'City Skyline placeholder', aiHint: 'city skyline' },
  { src: 'https://placehold.co/350x250.png', alt: 'Autumn Forest placeholder', aiHint: 'autumn forest' },
  { src: 'https://placehold.co/200x300.png', alt: 'Coastal Cliff placeholder', aiHint: 'coastal cliff' },
];


export function TaskCard({
  task,
  currentUser,
  onDelete,
  onPrint,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onUpdateChecklistItemTitle,
  onSetChecklistItemDueDate,
  onAssignUserToChecklistItem,
  onSetChecklistItemImage,
  // onApplyForRole, // This prop seems unused currently
  onUpdateTaskTitle,
  // onSetDueDate, // This prop seems unused for the main card footer options
  // onSetBackgroundImage, // This prop seems unused for the main card footer options
}: TaskCardProps) {
  const isOwner = currentUser && currentUser.id === task.userId;
  const { toast } = useToast();
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [editingItemAllDetails, setEditingItemAllDetails] = useState<ChecklistItem | null>(null);
  const [dialogTempTitle, setDialogTempTitle] = useState("");
  const [dialogTempDueDate, setDialogTempDueDate] = useState<Date | undefined>(undefined);
  const [dialogTempIsDatePickerOpen, setDialogTempIsDatePickerOpen] = useState(false);
  const [dialogTempAssignedUserId, setDialogTempAssignedUserId] = useState<string | null | undefined>(null);
  const [dialogTempAssignedUserName, setDialogTempAssignedUserName] = useState<string | null | undefined>(null);
  const [dialogTempAssignedUserAvatarUrl, setDialogTempAssignedUserAvatarUrl] = useState<string | null | undefined>(null);
  const [dialogTempImageUrl, setDialogTempImageUrl] = useState("");
  const [dialogTempImageAiHint, setDialogTempImageAiHint] = useState("");
  const dialogFileInpuRef = useRef<HTMLInputElement>(null);


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
  
  const handleOpenItemEditDialog = (item: ChecklistItem) => {
    if (!isOwner) return;
    setEditingItemAllDetails(item);
    setDialogTempTitle(item.title);
    setDialogTempDueDate(item.dueDate ? new Date(item.dueDate) : undefined);
    setDialogTempAssignedUserId(item.assignedUserId);
    setDialogTempAssignedUserName(item.assignedUserName);
    setDialogTempAssignedUserAvatarUrl(item.assignedUserAvatarUrl);
    setDialogTempImageUrl(item.imageUrl || "");
    setDialogTempImageAiHint(item.imageAiHint || "");
    if (dialogFileInpuRef.current) {
        dialogFileInpuRef.current.value = "";
    }
  };

  const handleCloseItemEditDialog = () => {
    setEditingItemAllDetails(null);
    // Reset all temporary states
    setDialogTempTitle("");
    setDialogTempDueDate(undefined);
    setDialogTempIsDatePickerOpen(false);
    setDialogTempAssignedUserId(null);
    setDialogTempAssignedUserName(null);
    setDialogTempAssignedUserAvatarUrl(null);
    setDialogTempImageUrl("");
    setDialogTempImageAiHint("");
    if (dialogFileInpuRef.current) {
        dialogFileInpuRef.current.value = "";
    }
  };

  const handleSaveItemEdits = () => {
    if (!editingItemAllDetails) return;

    if (dialogTempTitle.trim() && dialogTempTitle.trim() !== editingItemAllDetails.title) {
      onUpdateChecklistItemTitle(task.id, editingItemAllDetails.id, dialogTempTitle.trim());
    }
    
    const currentDueDate = editingItemAllDetails.dueDate ? new Date(editingItemAllDetails.dueDate).toISOString() : null;
    const newDueDate = dialogTempDueDate ? dialogTempDueDate.toISOString() : null;
    if (newDueDate !== currentDueDate) {
        onSetChecklistItemDueDate(task.id, editingItemAllDetails.id, dialogTempDueDate || null);
    }

    if (dialogTempAssignedUserId !== editingItemAllDetails.assignedUserId) {
        onAssignUserToChecklistItem(task.id, editingItemAllDetails.id, dialogTempAssignedUserId || null, dialogTempAssignedUserName || null, dialogTempAssignedUserAvatarUrl || null);
    }

    let finalImageUrl = dialogTempImageUrl.trim() || null;
    let finalImageAiHint = dialogTempImageAiHint.trim() || null;

    if (!finalImageUrl && finalImageAiHint) {
        finalImageUrl = `https://placehold.co/80x45.png`;
    } else if (finalImageUrl && !finalImageAiHint) {
        finalImageAiHint = dialogTempTitle.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
    }
    if (finalImageUrl !== editingItemAllDetails.imageUrl || finalImageAiHint !== editingItemAllDetails.imageAiHint) {
        onSetChecklistItemImage(task.id, editingItemAllDetails.id, finalImageUrl, finalImageAiHint);
    }

    handleCloseItemEditDialog();
    toast({ title: "Item Updated", description: "Checklist item details saved." });
  };

  const handleDeleteItemFromDialog = () => {
    if (editingItemAllDetails) {
        onDeleteChecklistItem(task.id, editingItemAllDetails.id);
        toast({ title: "Item Deleted", description: `"${editingItemAllDetails.title}" was removed from the checklist.` });
        handleCloseItemEditDialog();
    }
  };

  const handleDialogAssignToMe = () => {
      if (currentUser && isOwner) {
          setDialogTempAssignedUserId(currentUser.id);
          setDialogTempAssignedUserName(currentUser.displayName);
          setDialogTempAssignedUserAvatarUrl(currentUser.avatarUrl);
      }
  };
  const handleDialogUnassign = () => {
      if (isOwner) {
          setDialogTempAssignedUserId(null);
          setDialogTempAssignedUserName(null);
          setDialogTempAssignedUserAvatarUrl(null);
      }
  };

  const handleDialogImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        if (dialogFileInpuRef.current) dialogFileInpuRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDialogTempImageUrl(reader.result as string);
        if (!dialogTempImageAiHint.trim()) {
            const fileNameNoExt = file.name.split('.').slice(0, -1).join('.');
            setDialogTempImageAiHint(fileNameNoExt.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
        }
      };
      reader.onerror = () => toast({ title: "Error Reading File", variant: "destructive" });
      reader.readAsDataURL(file);
    }
  };

  const handleDialogRemoveImage = () => {
    setDialogTempImageUrl("");
    setDialogTempImageAiHint("");
    if (dialogFileInpuRef.current) dialogFileInpuRef.current.value = "";
  };


  const cardStyle: React.CSSProperties = {};
  let contentOverlayStyle: React.CSSProperties = {};

  if (task.backgroundImageUrl) {
    cardStyle.backgroundImage = `url(${task.backgroundImageUrl})`;
    cardStyle.backgroundSize = 'cover';
    cardStyle.backgroundPosition = 'center';
    contentOverlayStyle.backgroundColor = 'rgba(0, 0, 0, 0.5)'; 
    contentOverlayStyle.color = 'white'; 
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
             {task.completed && <PartyPopperIcon className={cn("ml-1 shrink-0 h-5 w-5", task.backgroundImageUrl ? "text-yellow-300" : "text-yellow-400")} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("flex-grow space-y-1 pt-1", !task.backgroundImageUrl && "p-4")}>
        {task.dueDate && (
          <div className={cn("text-sm flex items-center mb-2", task.backgroundImageUrl ? "text-gray-200" : "text-muted-foreground")}>
            <CalendarDaysIcon className="mr-1 h-3.5 w-3.5" />
            Due: {format(new Date(task.dueDate), "PP")}
          </div>
        )}

        {(task.checklistItems && task.checklistItems.length > 0) && (
          <div className="space-y-1 pr-1">
            {task.checklistItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col group/checklist text-sm rounded-md p-1.5 border",
                  task.backgroundImageUrl ? "border-white/30 bg-white/10 text-gray-100" : "border-border/60 bg-card text-card-foreground",
                   isOwner && "cursor-pointer hover:bg-opacity-20",
                   !isOwner && "cursor-default"
                )}
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card drag/drop or other parent clicks
                    if (isOwner) handleOpenItemEditDialog(item);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-grow min-w-0 relative">
                    <Checkbox
                      id={`checklist-${task.id}-${item.id}`}
                      checked={item.completed}
                      onCheckedChange={(checked) => {
                        onToggleChecklistItem(task.id, item.id)}
                      }
                      disabled={!isOwner}
                      className={cn(
                        "h-3.5 w-3.5 border-2 rounded-full data-[state=checked]:bg-green-400 shrink-0",
                        "transition-opacity duration-200 ease-in-out",
                        "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                        task.backgroundImageUrl ? "border-gray-300 data-[state=checked]:text-gray-800" : "border-muted-foreground data-[state=checked]:text-primary-foreground",
                        isOwner
                          ? "opacity-100" 
                          : "opacity-50 cursor-not-allowed"
                      )}
                      onClick={(e) => e.stopPropagation()} // Isolate checkbox click
                      aria-label={`Toggle completion for ${item.title}`}
                    />
                      <label
                        htmlFor={`checklist-${task.id}-${item.id}`}
                        className={cn(
                          "flex-grow break-all truncate",
                          "transition-all duration-200 ease-in-out",
                          "pl-[calc(0.875rem+0.5rem)]", // Always apply padding as checkbox is always there
                          item.completed && "line-through opacity-70",
                           task.backgroundImageUrl ? "text-gray-100" : "text-card-foreground",
                           "pointer-events-none" // Label click is handled by parent div
                        )}
                      >
                        {item.title}
                      </label>
                  </div>
                </div>
                {(item.dueDate || item.assignedUserId || item.imageUrl) && (
                  <div className={cn("mt-1 pt-1 border-t text-xs flex flex-col gap-y-1 items-start", task.backgroundImageUrl ? "border-white/20 text-gray-200" : "border-border/30 text-muted-foreground", "pointer-events-none")}>
                    {item.imageUrl && (
                      <div className="w-full mt-1 mb-1 h-[45px] relative overflow-hidden rounded">
                         <Image 
                            src={item.imageUrl} 
                            alt={item.title || "Checklist item image"}
                            layout="fill"
                            objectFit="cover"
                            className="rounded"
                            data-ai-hint={item.imageAiHint || item.title.split(/\s+/).slice(0,2).join(' ').toLowerCase()}
                          />
                      </div>
                    )}
                    <div className="flex items-center gap-x-3 w-full">
                      {item.dueDate && (
                        <div className="flex items-center">
                          <CalendarDaysIcon className="mr-1 h-3 w-3" />
                          {format(new Date(item.dueDate), "MMM d")}
                        </div>
                      )}
                      {item.assignedUserId && item.assignedUserName && (
                        <div className="flex items-center">
                          <Avatar className="h-4 w-4 mr-1">
                             <AvatarImage src={item.assignedUserAvatarUrl || undefined} alt={item.assignedUserName} data-ai-hint="user"/>
                             <AvatarFallback className={cn("text-xs", task.backgroundImageUrl ? "bg-white/30 text-white" : "bg-primary/20 text-primary" )}>{item.assignedUserName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {item.assignedUserName}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className={cn("mt-2 pt-2 border-t", task.backgroundImageUrl ? "border-gray-400/50" : "border-border/50")}>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Add checklist item..."
                value={newChecklistItemTitle}
                onChange={(e) => setNewChecklistItemTitle(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') handleAddChecklistItemSubmit(); }}
                className={cn(
                    "h-8 text-sm flex-grow",
                    task.backgroundImageUrl ? "bg-white/10 border-white/30 text-white placeholder-gray-300 focus:border-white/50" : "bg-background/50 border-input"
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
        <TooltipProvider>
           <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onPrint(task);}}
                  className={cn("h-7 w-7 hover:bg-black/10 dark:hover:bg-white/10", task.backgroundImageUrl ? "text-gray-300 hover:text-white" : "text-muted-foreground hover:text-foreground")}
                  aria-label="Print task"
                >
                  <PrinterIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className={cn(task.backgroundImageUrl && "bg-black/70 text-white border-white/20") }><p>Print Card</p></TooltipContent>
           </Tooltip>
        </TooltipProvider>

        {isOwner && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); onDelete(task); }}
                        className={cn("h-7 w-7 text-destructive hover:bg-destructive/10", task.backgroundImageUrl ? "hover:text-red-400" : "hover:text-destructive")}
                        aria-label="Delete task"
                        >
                        <Trash2Icon className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className={cn("bg-destructive text-destructive-foreground", task.backgroundImageUrl && "bg-red-500/80 text-white border-red-500/50")}><p>Delete Card</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardFooter>
      </div>

       {/* Unified Edit Dialog for Checklist Items */}
      {editingItemAllDetails && isOwner && (
        <Dialog open={!!editingItemAllDetails} onOpenChange={(isOpen) => { if (!isOpen) handleCloseItemEditDialog(); }}>
          <DialogContent
            className={cn("sm:max-w-lg bg-card text-card-foreground max-h-[90vh] flex flex-col", task.backgroundImageUrl && "bg-background/90 backdrop-blur-md border-white/40 text-white")}
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle className={cn(task.backgroundImageUrl && "text-white")}>Edit Item: {editingItemAllDetails.title}</DialogTitle>
            </DialogHeader>
            
            <div className="py-2 space-y-3 overflow-y-auto px-1 flex-grow">
              {/* Title */}
              <div>
                <Label htmlFor="dialogItemTitle" className={cn(task.backgroundImageUrl && "text-gray-200")}>Title</Label>
                <Input
                  id="dialogItemTitle"
                  value={dialogTempTitle}
                  onChange={(e) => setDialogTempTitle(e.target.value)}
                  className={cn(task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                />
              </div>

              {/* Due Date */}
              <div>
                <Label className={cn("block mb-1",task.backgroundImageUrl && "text-gray-200")}>Due Date</Label>
                 <Popover open={dialogTempIsDatePickerOpen} onOpenChange={setDialogTempIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal h-auto py-2",
                            !dialogTempDueDate && "text-muted-foreground",
                            task.backgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                        )}
                        >
                        <CalendarDaysIcon className="mr-2 h-4 w-4" />
                        {dialogTempDueDate ? format(dialogTempDueDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                        mode="single"
                        selected={dialogTempDueDate}
                        onSelect={(date) => { setDialogTempDueDate(date || undefined); setDialogTempIsDatePickerOpen(false); }}
                        initialFocus
                        className={cn(task.backgroundImageUrl && "bg-card text-card-foreground border-white/30")}
                        />
                    </PopoverContent>
                </Popover>
              </div>

              {/* Assign User */}
              <div>
                <Label className={cn("block mb-1",task.backgroundImageUrl && "text-gray-200")}>Assigned User</Label>
                {dialogTempAssignedUserId && dialogTempAssignedUserName ? (
                  <div className="flex items-center space-x-2 text-sm p-2 rounded-md border bg-muted/50 border-muted">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={dialogTempAssignedUserAvatarUrl || undefined} alt={dialogTempAssignedUserName} data-ai-hint="user portrait"/>
                        <AvatarFallback className={cn("text-xs", task.backgroundImageUrl ? "bg-white/30 text-white" : "bg-primary/20 text-primary")}>{dialogTempAssignedUserName.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span>{dialogTempAssignedUserName}</span>
                  </div>
                ) : (
                  <p className={cn("text-sm p-2 rounded-md border bg-muted/50 border-muted", task.backgroundImageUrl ? "text-gray-300 bg-white/5 border-white/20" : "text-muted-foreground")}>Not assigned.</p>
                )}
                <div className="mt-1.5 space-y-1.5">
                    {currentUser && dialogTempAssignedUserId !== currentUser.id && (
                        <Button onClick={handleDialogAssignToMe} className={cn("w-full text-xs h-auto py-1.5", task.backgroundImageUrl && "bg-white/20 hover:bg-white/30 text-white")}>
                            <UserCircleIcon className="mr-2 h-3.5 w-3.5" /> Assign to Me
                        </Button>
                    )}
                    {dialogTempAssignedUserId && (
                         <Button variant="outline" onClick={handleDialogUnassign} className={cn("w-full text-xs h-auto py-1.5", task.backgroundImageUrl && "bg-transparent border-white/40 hover:bg-white/10 text-white")}>
                            Unassign
                        </Button>
                    )}
                </div>
              </div>
              
              {/* Image Management */}
              <div>
                 <Label className={cn("block mb-1",task.backgroundImageUrl && "text-gray-200")}>Image</Label>
                 { (dialogTempImageUrl) && (
                    <div className="mb-2 w-full h-32 relative overflow-hidden rounded-md border border-border">
                        <Image 
                        src={dialogTempImageUrl} 
                        alt={dialogTempImageAiHint || "Checklist item image"}
                        layout="fill" 
                        objectFit="cover" 
                        className="rounded-md"
                        data-ai-hint={dialogTempImageAiHint || dialogTempTitle.split(/\s+/).slice(0,2).join(' ').toLowerCase()}
                        />
                    </div>
                    )}
                <div>
                  <Label htmlFor="dialogItemImageUrl" className={cn("text-xs",task.backgroundImageUrl && "text-gray-200")}>Image URL</Label>
                  <Input 
                    id="dialogItemImageUrl" 
                    value={dialogTempImageUrl} 
                    onChange={(e) => setDialogTempImageUrl(e.target.value)} 
                    placeholder="https://..." 
                    className={cn("text-sm h-9",task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                  />
                </div>
                <div className="mt-1.5">
                   <Label htmlFor="dialogItemImageFile" className={cn("text-xs", task.backgroundImageUrl && "text-gray-200")}>Or Upload Image</Label>
                   <Input 
                      id="dialogItemImageFile" 
                      type="file"
                      accept="image/*"
                      ref={dialogFileInpuRef}
                      onChange={handleDialogImageFileChange}
                      className={cn("text-xs p-1 h-auto file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-input file:bg-transparent file:text-xs file:font-medium file:text-foreground", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 file:text-gray-200 file:border-white/30 hover:file:bg-white/5")}
                    />
                    <p className={cn("text-xs mt-0.5", task.backgroundImageUrl ? "text-gray-400" : "text-muted-foreground")}>Max 2MB. Upload generates a Data URI.</p>
                </div>
                 <div className="mt-1.5">
                  <Label htmlFor="dialogItemImageAiHint" className={cn("text-xs",task.backgroundImageUrl && "text-gray-200")}>AI Hint (1-2 words)</Label>
                  <Input 
                    id="dialogItemImageAiHint" 
                    value={dialogTempImageAiHint} 
                    onChange={(e) => setDialogTempImageAiHint(e.target.value)} 
                    placeholder="e.g., 'nature forest'" 
                    className={cn("text-sm h-9",task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                  />
                   <p className={cn("text-xs mt-0.5", task.backgroundImageUrl ? "text-gray-400" : "text-muted-foreground")}>
                      If no URL/upload, placeholder used with this hint. If no hint, title words used.
                    </p>
                </div>
                <div className="mt-2 pt-2 border-t border-border/50">
                  <Label className={cn("block mb-1.5 text-xs font-medium", task.backgroundImageUrl ? "text-gray-200" : "text-foreground")}>Or select a suggestion:</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {suggestedImages.map((img) => (
                      <div
                        key={img.aiHint}
                        onClick={() => {
                          setDialogTempImageUrl(img.src);
                          setDialogTempImageAiHint(img.aiHint);
                        }}
                        className="cursor-pointer rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {setDialogTempImageUrl(img.src); setDialogTempImageAiHint(img.aiHint);}}}
                      >
                        <div className="w-full h-[45px] sm:h-[50px] relative">
                          <Image
                            src={img.src}
                            alt={img.alt}
                            layout="fill"
                            objectFit="cover"
                            className="rounded-sm"
                            data-ai-hint={img.aiHint}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                 { (dialogTempImageUrl || editingItemAllDetails.imageUrl) && 
                    <Button size="sm" variant="outline" onClick={handleDialogRemoveImage} className={cn("w-full mt-2 text-xs h-auto py-1.5", task.backgroundImageUrl && "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300")}>
                        <TrashIcon className="mr-2 h-3.5 w-3.5"/>Remove Current Image
                    </Button>
                }
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-1 pt-3 border-t border-border">
              <Button variant="destructive" onClick={handleDeleteItemFromDialog} className={cn(task.backgroundImageUrl && "bg-red-500/80 hover:bg-red-500/90 text-white")}>
                Delete Item
              </Button>
              <div className="flex-grow sm:flex-grow-0"></div> {/* Spacer */}
              <DialogClose asChild>
                <Button variant="ghost" onClick={handleCloseItemEditDialog} className={cn(task.backgroundImageUrl && "text-gray-300 hover:bg-white/10")}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleSaveItemEdits} className={cn(task.backgroundImageUrl && "bg-white/20 hover:bg-white/30 text-white")}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
