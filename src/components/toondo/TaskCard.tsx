
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, CalendarDaysIcon, PlusCircleIcon, Trash2Icon, UserCircleIcon, Image as ImageIcon, TrashIcon, MessageSquareIcon, Circle, CheckCircle2, Edit3Icon as MoreOptionsIcon } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { EditableTitle } from "./EditableTitle";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


interface TaskCardProps {
  task: Task;
  currentUser: User | null;
  onDelete: (task: Task) => void;
  onPrint: (task: Task) => void;
  onAddChecklistItem: (taskId: string, itemTitle: string) => void;
  onToggleChecklistItem: (taskId: string, itemId: string) => void;
  onDeleteChecklistItem: (taskId: string, itemId: string) => void;
  onUpdateChecklistItemTitle: (taskId: string, itemId: string, newTitle: string) => void;
  onUpdateChecklistItemDescription: (taskId: string, itemId: string, newDescription: string) => void;
  onSetChecklistItemDueDate: (taskId: string, itemId: string, date: Date | null) => void;
  onAssignUserToChecklistItem: (taskId: string, itemId: string, userId: string | null, userName: string | null, userAvatarUrl: string | null) => void;
  onSetChecklistItemImage: (taskId: string, itemId: string, imageUrl: string | null, imageAiHint: string | null) => void;
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
  onUpdateChecklistItemDescription,
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

  const [editingItemAllDetails, setEditingItemAllDetails] = useState<ChecklistItem | null>(null);
  // State for the dialog's temporary values
  const [dialogTempTitle, setDialogTempTitle] = useState("");
  const [dialogTempDescription, setDialogTempDescription] = useState("");
  const [dialogTempDueDate, setDialogTempDueDate] = useState<Date | undefined>(undefined);
  const [dialogTempIsDatePickerOpen, setDialogTempIsDatePickerOpen] = useState(false);
  const [dialogTempAssignedUserId, setDialogTempAssignedUserId] = useState<string | null | undefined>(null);
  const [dialogTempAssignedUserName, setDialogTempAssignedUserName] = useState<string | null | undefined>(null);
  const [dialogTempAssignedUserAvatarUrl, setDialogTempAssignedUserAvatarUrl] = useState<string | null | undefined>(null);
  const [dialogTempImageUrl, setDialogTempImageUrl] = useState("");
  const [dialogTempComments, setDialogTempComments] = useState<string[]>([]); // For future use
  const dialogFileInpuRef = useRef<HTMLInputElement>(null);


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
    setDialogTempDescription(item.description || "");
    setDialogTempDueDate(item.dueDate ? new Date(item.dueDate) : undefined);
    setDialogTempAssignedUserId(item.assignedUserId);
    setDialogTempAssignedUserName(item.assignedUserName);
    setDialogTempAssignedUserAvatarUrl(item.assignedUserAvatarUrl);
    setDialogTempImageUrl(item.imageUrl || "");
    setDialogTempComments(item.comments || []);
    if (dialogFileInpuRef.current) {
        dialogFileInpuRef.current.value = "";
    }
  };

  const handleCloseItemEditDialog = () => {
    setEditingItemAllDetails(null);
    // Reset temp states, maybe not all if some persistence is desired on cancel
    setDialogTempTitle("");
    setDialogTempDescription("");
    setDialogTempDueDate(undefined);
    setDialogTempIsDatePickerOpen(false);
    setDialogTempAssignedUserId(null);
    setDialogTempAssignedUserName(null);
    setDialogTempAssignedUserAvatarUrl(null);
    setDialogTempImageUrl("");
    setDialogTempComments([]);
    if (dialogFileInpuRef.current) {
        dialogFileInpuRef.current.value = "";
    }
  };

  const handleSaveItemEdits = () => {
    if (!editingItemAllDetails) return;

    const trimmedTitle = dialogTempTitle.trim();
    if (!trimmedTitle) {
        toast({ title: "Title Required", description: "Checklist item title cannot be empty.", variant: "destructive" });
        setDialogTempTitle(editingItemAllDetails.title); // Revert to original if user tried to blank it
        return; 
    }
    if (trimmedTitle !== editingItemAllDetails.title) {
      onUpdateChecklistItemTitle(task.id, editingItemAllDetails.id, trimmedTitle);
    }


    if (dialogTempDescription.trim() !== (editingItemAllDetails.description || "").trim()) {
      onUpdateChecklistItemDescription(task.id, editingItemAllDetails.id, dialogTempDescription.trim());
    }
    
    const currentDueDate = editingItemAllDetails.dueDate ? new Date(editingItemAllDetails.dueDate).toISOString() : null;
    const newDueDate = dialogTempDueDate ? dialogTempDueDate.toISOString() : null;
    if (newDueDate !== currentDueDate) {
        onSetChecklistItemDueDate(task.id, editingItemAllDetails.id, dialogTempDueDate || null);
    }

    if (dialogTempAssignedUserId !== editingItemAllDetails.assignedUserId) {
        onAssignUserToChecklistItem(task.id, editingItemAllDetails.id, dialogTempAssignedUserId || null, dialogTempAssignedUserName || null, dialogTempAssignedUserAvatarUrl || null);
    }

    const finalImageUrl = dialogTempImageUrl.trim() || null;
    let finalImageAiHint: string | null = null;

    if (finalImageUrl) {
      // Automatically derive AI hint from the first one or two words of the title
      finalImageAiHint = trimmedTitle.split(/\s+/).slice(0, 2).join(' ').toLowerCase() || "image";
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
      };
      reader.onerror = () => toast({ title: "Error Reading File", variant: "destructive" });
      reader.readAsDataURL(file);
    }
  };

  const handleDialogRemoveImage = () => {
    setDialogTempImageUrl("");
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
             <EditableTitle
                initialValue={task.title}
                onSave={(newTitle) => onUpdateTaskTitle(task.id, newTitle)}
                isEditable={isOwner}
                textElement="div" 
                containerClassName={cn("text-xl font-bold")} 
                textClassName={cn(task.backgroundImageUrl ? "text-white" : "text-card-foreground")}
                inputClassName={cn(
                    "text-xl font-bold", 
                    task.backgroundImageUrl ? "bg-transparent text-white placeholder-gray-300" : "bg-transparent"
                )}
                editIconClassName={cn(task.backgroundImageUrl ? "text-gray-300" : "text-muted-foreground")}
                ariaLabel="Task title"
             />
          </div>
          <div className="flex items-center space-x-1 shrink-0">
             {task.completed && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("text-yellow-300", task.backgroundImageUrl ? "text-yellow-300" : "text-yellow-400")}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className={cn(task.backgroundImageUrl && "bg-black/70 text-white border-white/20" )}>
                            <p>Completed!</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
             )}
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
                    e.stopPropagation();
                    const target = e.target as HTMLElement;
                    if (target.closest('button[role="checkbox"]') || target.closest('[data-no-dialog-trigger="true"]')) {
                        return;
                    }
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
                      onClick={(e) => e.stopPropagation()} 
                      aria-label={`Toggle completion for ${item.title}`}
                    />
                      <label
                        htmlFor={`checklist-${task.id}-${item.id}`} 
                        className={cn(
                          "flex-grow break-all truncate",
                          "transition-all duration-200 ease-in-out",
                          "pl-[calc(0.875rem+0.5rem)]", 
                          item.completed && "line-through opacity-70",
                           task.backgroundImageUrl ? "text-gray-100" : "text-card-foreground",
                           "pointer-events-none" 
                        )}
                      >
                        {item.title}
                      </label>
                  </div>
                </div>
                {(item.description || item.dueDate || item.assignedUserId || item.imageUrl) && (
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
                     {item.description && (
                        <p className="italic truncate w-full text-ellipsis text-gray-400/90 dark:text-gray-500/90">
                          {item.description.length > 50 ? `${item.description.substring(0, 47)}...` : item.description}
                        </p>
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

      {editingItemAllDetails && isOwner && (
        <Dialog open={!!editingItemAllDetails} onOpenChange={(isOpen) => { if (!isOpen) handleCloseItemEditDialog(); }}>
          <DialogContent
            className={cn("sm:max-w-3xl bg-card text-card-foreground max-h-[90vh] flex flex-col", task.backgroundImageUrl && "bg-background/90 backdrop-blur-md border-white/40 text-white")}
            onClick={(e) => e.stopPropagation()}
          >
            <DialogHeader className="pb-2 border-b border-border">
              <DialogTitle className={cn("text-xl", task.backgroundImageUrl && "text-white")}>
                Edit Item: {editingItemAllDetails.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-3 flex-grow overflow-y-auto grid grid-cols-1 gap-x-6 gap-y-4 items-start">
              {/* Top Image */}
              <div className="col-span-1 mb-1">
                {dialogTempImageUrl ? (
                  <div className="w-full h-48 relative overflow-hidden rounded-md border border-border">
                    <Image 
                      src={dialogTempImageUrl} 
                      alt={dialogTempTitle || "Checklist item image"}
                      layout="fill" 
                      objectFit="cover" 
                      className="rounded-md"
                      data-ai-hint={dialogTempTitle.split(/\s+/).slice(0,2).join(' ').toLowerCase()}
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-muted rounded-md border border-dashed border-border">
                    <ImageIcon className={cn("h-10 w-10", task.backgroundImageUrl ? "text-gray-400" : "text-muted-foreground")} />
                  </div>
                )}
              </div>

              {/* Main Content Area (Two Columns) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-start">
                {/* Left Column */}
                <div className="md:col-span-2 space-y-3 pr-1">
                  <div className="flex items-center space-x-2">
                     <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                     <EditableTitle
                        initialValue={dialogTempTitle}
                        onSave={(newTitle) => setDialogTempTitle(newTitle)}
                        isEditable={true} 
                        textElement='div'
                        textClassName={cn("text-lg font-medium py-1",task.backgroundImageUrl && "text-gray-100")} 
                        inputClassName={cn("text-lg font-medium h-auto p-0", task.backgroundImageUrl && "bg-transparent text-white placeholder-gray-300")}
                        placeholder="Item title..."
                        ariaLabel="Item title"
                        showEditIcon={true} 
                        containerClassName="flex-grow" 
                     />
                  </div>

                  {/* Attachment Section */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <h4 className={cn("text-sm font-medium mb-1", task.backgroundImageUrl && "text-gray-200")}>Attachment</h4>
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
                    
                    { (dialogTempImageUrl || (editingItemAllDetails && editingItemAllDetails.imageUrl)) && 
                        <Button size="sm" variant="outline" onClick={handleDialogRemoveImage} className={cn("w-full mt-2 text-xs h-auto py-1.5", task.backgroundImageUrl && "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300")}>
                            <TrashIcon className="mr-2 h-3.5 w-3.5"/>Remove Current Image
                        </Button>
                    }
                  </div>

                  {/* Due Date Section */}
                  <div className="pt-2 border-t border-border/50">
                     <div> 
                        <Label className={cn("block mb-1",task.backgroundImageUrl && "text-gray-200")}>Due Date</Label>
                        <div className="flex items-center">
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
                              <PopoverContent className="w-auto p-0" align="start" side="right">
                                  <Calendar
                                  mode="single"
                                  selected={dialogTempDueDate}
                                  onSelect={(date) => { setDialogTempDueDate(date || undefined); setDialogTempIsDatePickerOpen(false); }}
                                  initialFocus
                                  className={cn(task.backgroundImageUrl && "bg-card text-card-foreground border-white/30")}
                                  />
                              </PopoverContent>
                          </Popover>
                          {editingItemAllDetails?.completed && (
                            <Badge variant="outline" className="ml-2 border-green-600 bg-green-100 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400 text-xs px-1.5 py-0.5 h-auto flex items-center whitespace-nowrap">
                              <CheckCircle2 className="mr-1 h-3 w-3 flex-shrink-0" /> Done
                            </Badge>
                          )}
                        </div>
                    </div>
                  </div>
                  
                  {/* Description Section */}
                  <div className="pt-2 border-t border-border/50">
                    <Label htmlFor="dialogItemDescription" className={cn(task.backgroundImageUrl && "text-gray-200")}>Description</Label>
                    <Textarea
                      id="dialogItemDescription"
                      value={dialogTempDescription}
                      onChange={(e) => setDialogTempDescription(e.target.value)}
                      placeholder="Add more details about this item..."
                      className={cn("min-h-[60px]",task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                      rows={3}
                    />
                  </div>

                  {/* Assigned User Section */}
                  <div className="pt-2 border-t border-border/50">
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
                  </div>
                </div>

                {/* Right Column - Comments */}
                <div className="md:col-span-1 space-y-3 border-t md:border-t-0 md:border-l border-border/50 pt-3 md:pt-0 md:pl-4">
                  <h4 className={cn("text-sm font-medium flex items-center", task.backgroundImageUrl && "text-gray-200")}>
                    <MessageSquareIcon className="mr-2 h-4 w-4" /> Comments
                  </h4>
                  <div className={cn("h-40 p-2 border border-dashed rounded-md flex items-center justify-center", task.backgroundImageUrl ? "border-white/30 bg-white/5" : "border-border bg-muted/30")}>
                    <p className={cn("text-xs", task.backgroundImageUrl ? "text-gray-400" : "text-muted-foreground")}>
                      Comments functionality coming soon.
                      {dialogTempComments && dialogTempComments.length > 0 && (
                        <span className="block mt-2">Current comments: {dialogTempComments.join(', ')}</span>
                      )}
                    </p>
                  </div>
                   {/* Placeholder for future comment input and display list */}
                </div>
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
