
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, Edit3Icon, CalendarDaysIcon, PartyPopperIcon, PlusCircleIcon, Trash2Icon, UserPlusIcon, MoreHorizontalIcon, UserCircleIcon, ImagePlusIcon, Image as ImageIcon, UploadIcon } from "lucide-react";
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
  { src: 'https://placehold.co/300x200.png', alt: 'City Skyline placeholder', aiHint: 'city skyline' },
  { src: 'https://placehold.co/300x200.png', alt: 'Autumn Forest placeholder', aiHint: 'autumn forest' },
  { src: 'https://placehold.co/300x200.png', alt: 'Coastal Cliff placeholder', aiHint: 'coastal cliff' },
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

  const [showFireworks, setShowFireworks] = useState(false);
  const prevCompleted = useRef(task.completed);

  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null);
  const [editingChecklistItemNewTitle, setEditingChecklistItemNewTitle] = useState("");
  const checklistItemInputRef = useRef<HTMLInputElement>(null);

  const [editingItemDueDateId, setEditingItemDueDateId] = useState<string | null>(null);
  const [selectedItemDate, setSelectedItemDate] = useState<Date | undefined>(undefined);
  const [isItemDatePickerOpen, setIsItemDatePickerOpen] = useState<Record<string, boolean>>({});

  const [assigningUserItemId, setAssigningUserItemId] = useState<string | null>(null);

  const [editingImageItemId, setEditingImageItemId] = useState<string | null>(null);
  const [currentImageUrlInput, setCurrentImageUrlInput] = useState("");
  const [currentImageAiHintInput, setCurrentImageAiHintInput] = useState("");
  const [itemForImageDialog, setItemForImageDialog] = useState<ChecklistItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


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

  const handleSetItemDueDate = (itemId: string, date: Date | undefined) => {
    onSetChecklistItemDueDate(task.id, itemId, date || null);
    setIsItemDatePickerOpen(prev => ({ ...prev, [itemId]: false }));
    setEditingItemDueDateId(null);
  };

  const handleToggleItemDatePicker = (itemId: string, currentDueDate?: string | null) => {
    setEditingItemDueDateId(itemId);
    setSelectedItemDate(currentDueDate ? new Date(currentDueDate) : undefined);
    setIsItemDatePickerOpen(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };
  
  const handleAssignToMe = (itemId: string) => {
    if (currentUser && isOwner) {
      onAssignUserToChecklistItem(task.id, itemId, currentUser.id, currentUser.displayName, currentUser.avatarUrl);
    }
    setAssigningUserItemId(null);
  };

  const handleUnassignItem = (itemId: string) => {
     if (isOwner || (currentUser && task.checklistItems?.find(item => item.id === itemId)?.assignedUserId === currentUser.id)) {
        onAssignUserToChecklistItem(task.id, itemId, null, null, null);
     }
     setAssigningUserItemId(null);
  };

  const handleOpenImageDialog = (item: ChecklistItem) => {
    setItemForImageDialog(item);
    setCurrentImageUrlInput(item.imageUrl || "");
    setCurrentImageAiHintInput(item.imageAiHint || "");
    setEditingImageItemId(item.id);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Example: 2MB limit
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentImageUrlInput(reader.result as string);
        // Optionally auto-fill AI hint from filename if empty
        if (!currentImageAiHintInput.trim()) {
            const fileNameNoExt = file.name.split('.').slice(0, -1).join('.');
            setCurrentImageAiHintInput(fileNameNoExt.split(/\s+/).slice(0, 2).join(' ').toLowerCase());
        }
      };
      reader.onerror = () => {
        toast({
          title: "Error Reading File",
          description: "Could not read the selected image file.",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveImage = () => {
    if (editingImageItemId) {
      let finalImageUrl: string | null = currentImageUrlInput.trim() || null;
      let finalImageAiHint: string | null = currentImageAiHintInput.trim() || null;

      if (!finalImageUrl && finalImageAiHint) {
        finalImageUrl = `https://placehold.co/80x45.png`;
      } else if (finalImageUrl && !finalImageAiHint && itemForImageDialog) {
        // If URL is present (could be Data URI) and hint is empty, generate from title
        finalImageAiHint = itemForImageDialog.title.split(/\s+/).slice(0, 2).join(' ').toLowerCase();
      }
      
      onSetChecklistItemImage(task.id, editingImageItemId, finalImageUrl, finalImageAiHint);
      toast({ title: "Image Updated", description: "Checklist item image details saved." });
    }
    setEditingImageItemId(null);
    setItemForImageDialog(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleRemoveImage = () => {
    if (editingImageItemId) {
      onSetChecklistItemImage(task.id, editingImageItemId, null, null);
      toast({ title: "Image Removed", description: "Checklist item image removed." });
    }
    setCurrentImageUrlInput("");
    setCurrentImageAiHintInput("");
    setEditingImageItemId(null);
    setItemForImageDialog(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
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
                  editingChecklistItemId === item.id && (task.backgroundImageUrl ? "bg-white/20" : "bg-muted/50")
                )}
              >
                <div className="flex items-center justify-between">
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
                        style={{ paddingLeft: 'calc(0.875rem + 0.5rem)' }}
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
                        side="right"
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                        className={cn("bg-popover text-popover-foreground w-44", task.backgroundImageUrl && "bg-background/80 backdrop-blur-sm border-white/30 text-white")}
                      >
                        <DropdownMenuItem onClick={() => handleStartEditChecklistItem(item)} className={cn(task.backgroundImageUrl && "focus:bg-white/20")}>
                          <Edit3Icon className="mr-2 h-3.5 w-3.5" />
                          Edit Item
                        </DropdownMenuItem>

                        <Popover open={isItemDatePickerOpen[item.id] || false} onOpenChange={(isOpen) => setIsItemDatePickerOpen(prev => ({ ...prev, [item.id]: isOpen }))}>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className={cn("w-full justify-start px-2 py-1.5 text-sm font-normal h-auto", task.backgroundImageUrl && "hover:bg-white/20 text-white")} onClick={() => handleToggleItemDatePicker(item.id, item.dueDate)}>
                              <CalendarDaysIcon className="mr-2 h-3.5 w-3.5" /> Set Due Date
                            </Button>
                          </PopoverTrigger>
                          {editingItemDueDateId === item.id && (
                            <PopoverContent className="w-auto p-0" side="right" align="start" sideOffset={5}>
                              <Calendar
                                mode="single"
                                selected={selectedItemDate}
                                onSelect={(date) => handleSetItemDueDate(item.id, date)}
                                initialFocus
                                className={cn(task.backgroundImageUrl && "bg-card text-card-foreground border-white/30")}
                              />
                            </PopoverContent>
                          )}
                        </Popover>

                        <Dialog open={assigningUserItemId === item.id} onOpenChange={(isOpen) => { if (!isOpen) setAssigningUserItemId(null); else setAssigningUserItemId(item.id); }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className={cn("w-full justify-start px-2 py-1.5 text-sm font-normal h-auto", task.backgroundImageUrl && "hover:bg-white/20 text-white")}>
                              <UserPlusIcon className="mr-2 h-3.5 w-3.5" /> Assign User
                            </Button>
                          </DialogTrigger>
                          {assigningUserItemId === item.id && (
                            <DialogContent className={cn("sm:max-w-[425px] bg-card text-card-foreground", task.backgroundImageUrl && "bg-background/90 backdrop-blur-md border-white/40 text-white placeholder-gray-300")} onClick={(e) => e.stopPropagation()}>
                              <DialogHeader>
                                <DialogTitle className={cn(task.backgroundImageUrl && "text-white")}>Assign User to: {item.title}</DialogTitle>
                              </DialogHeader>
                              <div className="py-4 space-y-3">
                                {item.assignedUserId && item.assignedUserName && (
                                   <div className="flex items-center space-x-2 text-sm">
                                      <Avatar className="h-6 w-6">
                                          <AvatarImage src={item.assignedUserAvatarUrl || undefined} alt={item.assignedUserName} data-ai-hint="user portrait"/>
                                          <AvatarFallback className={cn("text-xs", task.backgroundImageUrl ? "bg-white/30 text-white" : "bg-primary/20 text-primary")}>{item.assignedUserName.charAt(0).toUpperCase()}</AvatarFallback>
                                      </Avatar>
                                      <span>Currently assigned to: <strong>{item.assignedUserName}</strong></span>
                                  </div>
                                )}
                                {!item.assignedUserId && <p className={cn("text-sm", task.backgroundImageUrl ? "text-gray-300" : "text-muted-foreground")}>Not assigned to anyone.</p>}

                                {isOwner && currentUser && item.assignedUserId !== currentUser.id && (
                                  <Button onClick={() => handleAssignToMe(item.id)} className={cn("w-full", task.backgroundImageUrl && "bg-white/20 hover:bg-white/30 text-white")}>
                                    <UserCircleIcon className="mr-2 h-4 w-4" /> Assign to Me ({currentUser.displayName})
                                  </Button>
                                )}
                                {(isOwner || (currentUser && item.assignedUserId === currentUser.id)) && item.assignedUserId && (
                                  <Button variant="outline" onClick={() => handleUnassignItem(item.id)} className={cn("w-full", task.backgroundImageUrl && "bg-transparent border-white/40 hover:bg-white/10 text-white")}>
                                    Unassign
                                  </Button>
                                )}
                              </div>
                               <DialogFooter>
                                <DialogClose asChild><Button variant="ghost" className={cn(task.backgroundImageUrl && "text-gray-300 hover:bg-white/10")}>Close</Button></DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>
                        
                        <Dialog open={editingImageItemId === item.id} onOpenChange={(isOpen) => { if (!isOpen) setEditingImageItemId(null); }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" className={cn("w-full justify-start px-2 py-1.5 text-sm font-normal h-auto", task.backgroundImageUrl && "hover:bg-white/20 text-white")} onClick={() => handleOpenImageDialog(item)}>
                              <ImageIcon className="mr-2 h-3.5 w-3.5" /> Add/Change Image
                            </Button>
                          </DialogTrigger>
                          {editingImageItemId === item.id && itemForImageDialog && (
                            <DialogContent className={cn("sm:max-w-md bg-card text-card-foreground", task.backgroundImageUrl && "bg-background/90 backdrop-blur-md border-white/40 text-white")} onClick={(e) => e.stopPropagation()}>
                              <DialogHeader>
                                <DialogTitle className={cn(task.backgroundImageUrl && "text-white")}>Image for: {itemForImageDialog.title}</DialogTitle>
                              </DialogHeader>
                              <div className="py-4 space-y-4">
                                { (currentImageUrlInput || itemForImageDialog.imageUrl) && (
                                  <div className="mb-2 w-full h-32 relative overflow-hidden rounded-md">
                                    <Image 
                                      src={currentImageUrlInput || itemForImageDialog.imageUrl!} 
                                      alt={currentImageAiHintInput || itemForImageDialog.imageAiHint || "Checklist item image"}
                                      layout="fill" 
                                      objectFit="cover" 
                                      className="rounded-md"
                                      data-ai-hint={currentImageAiHintInput || itemForImageDialog.imageAiHint || itemForImageDialog.title.split(/\s+/).slice(0,2).join(' ').toLowerCase()}
                                    />
                                  </div>
                                )}
                                <div>
                                  <Label htmlFor="itemImageUrl" className={cn(task.backgroundImageUrl && "text-gray-200")}>Image URL</Label>
                                  <Input 
                                    id="itemImageUrl" 
                                    value={currentImageUrlInput} 
                                    onChange={(e) => setCurrentImageUrlInput(e.target.value)} 
                                    placeholder="https://example.com/image.png or /images/my-image.jpg" 
                                    className={cn(task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                                  />
                                </div>

                                <div className="space-y-1">
                                   <Label htmlFor="itemImageFile" className={cn(task.backgroundImageUrl && "text-gray-200")}>Or Upload Image</Label>
                                   <div className="flex items-center space-x-2">
                                    <Input 
                                      id="itemImageFile" 
                                      type="file"
                                      accept="image/*"
                                      ref={fileInputRef}
                                      onChange={handleImageFileChange}
                                      className={cn("text-sm p-1 h-auto file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-input file:bg-transparent file:text-sm file:font-medium file:text-foreground", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 file:text-gray-200 file:border-white/30 hover:file:bg-white/5")}
                                    />
                                   </div>
                                  <p className={cn("text-xs", task.backgroundImageUrl ? "text-gray-400" : "text-muted-foreground")}>
                                    Max 2MB. Uploading will generate a Data URI.
                                  </p>
                                </div>


                                <div>
                                  <Label htmlFor="itemImageAiHint" className={cn(task.backgroundImageUrl && "text-gray-200")}>AI Hint (1-2 words)</Label>
                                  <Input 
                                    id="itemImageAiHint" 
                                    value={currentImageAiHintInput} 
                                    onChange={(e) => setCurrentImageAiHintInput(e.target.value)} 
                                    placeholder="e.g., 'nature forest'" 
                                    className={cn(task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                                  />
                                  <p className={cn("text-xs mt-1", task.backgroundImageUrl ? "text-gray-400" : "text-muted-foreground")}>
                                    If no URL/upload, placeholder used with this hint. If no hint, first 2 words of title used.
                                  </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-border/50">
                                  <Label className={cn("block mb-2 text-sm font-medium", task.backgroundImageUrl ? "text-gray-200" : "text-foreground")}>Or select a suggestion:</Label>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {suggestedImages.map((img) => (
                                      <div
                                        key={img.aiHint}
                                        onClick={() => {
                                          setCurrentImageUrlInput(img.src);
                                          setCurrentImageAiHintInput(img.aiHint);
                                        }}
                                        className="cursor-pointer rounded-md overflow-hidden border-2 border-transparent hover:border-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                                        tabIndex={0}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setCurrentImageUrlInput(img.src); setCurrentImageAiHintInput(img.aiHint);}}}
                                      >
                                        <div className="w-full h-[50px] sm:h-[60px] relative">
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

                              </div>
                              <DialogFooter className="gap-2 sm:gap-0">
                                {(itemForImageDialog.imageUrl || currentImageUrlInput) && 
                                  <Button variant="destructive" onClick={handleRemoveImage} className={cn(task.backgroundImageUrl && "bg-red-500/80 hover:bg-red-500/90 text-white")}>Remove Image</Button>
                                }
                                <Button onClick={handleSaveImage} className={cn(task.backgroundImageUrl && "bg-white/20 hover:bg-white/30 text-white")}>Save Image</Button>
                                <DialogClose asChild><Button variant="ghost" className={cn(task.backgroundImageUrl && "text-gray-300 hover:bg-white/10")}>Cancel</Button></DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>


                        <DropdownMenuSeparator className={cn(task.backgroundImageUrl && "bg-white/20")} />
                        <DropdownMenuItem
                          onClick={() => onDeleteChecklistItem(task.id, item.id)}
                          className={cn("focus:bg-destructive/10", task.backgroundImageUrl ? "text-red-400 hover:!bg-red-500/30 focus:text-red-300" : "text-destructive focus:text-destructive")}
                        >
                          <Trash2Icon className="mr-2 h-3.5 w-3.5" />
                          Delete Item
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                {(item.dueDate || item.assignedUserId || item.imageUrl) && (
                  <div className={cn("mt-1 pt-1 border-t text-xs flex flex-col gap-y-1 items-start", task.backgroundImageUrl ? "border-white/20 text-gray-200" : "border-border/30 text-muted-foreground")}>
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
    </Card>
  );
}
