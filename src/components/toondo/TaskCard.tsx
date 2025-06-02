
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, CalendarDaysIcon, PlusCircleIcon, Trash2Icon, UserCircleIcon, ImageIcon, TrashIcon, MessageSquareIcon, CheckCircle2, PaperclipIcon, TagIcon, Edit3Icon, AlignLeftIcon } from "lucide-react";
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
import { marked } from 'marked';

const LABEL_COLORS = [
  "bg-red-500",
  "bg-yellow-500",
  "bg-green-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
];
const MAX_LABELS = 6;

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
  onSetChecklistItemLabel: (taskId: string, itemId: string, newLabels: string[] | null) => void;
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
  onSetChecklistItemLabel,
  onUpdateTaskTitle,
}: TaskCardProps) {
  const isOwner = currentUser && currentUser.id === task.userId;
  const { toast } = useToast();
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState("");

  const [editingItemAllDetails, setEditingItemAllDetails] = useState<ChecklistItem | null>(null);
  // State for the main edit dialog's temporary values
  const [dialogTempTitle, setDialogTempTitle] = useState("");
  const [dialogTempDescription, setDialogTempDescription] = useState("");
  const [dialogTempCompleted, setDialogTempCompleted] = useState(false);
  const [dialogTempDueDate, setDialogTempDueDate] = useState<Date | undefined>(undefined);
  const [dialogTempAssignedUserId, setDialogTempAssignedUserId] = useState<string | null>(null);
  const [dialogTempAssignedUserName, setDialogTempAssignedUserName] = useState<string | null>(null);
  const [dialogTempAssignedUserAvatarUrl, setDialogTempAssignedUserAvatarUrl] = useState<string | null>(null);
  const [dialogTempImageUrl, setDialogTempImageUrl] = useState<string>("");
  const [dialogTempLabel, setDialogTempLabel] = useState<string[]>([]);

  // State for sub-dialogs/popovers within the main edit dialog
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const attachmentDialogFileInpuRef = useRef<HTMLInputElement>(null);
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);
  const [isDueDatePopoverOpen, setIsDueDatePopoverOpen] = useState(false);
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);


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
    setDialogTempCompleted(item.completed);
    setDialogTempDueDate(item.dueDate ? new Date(item.dueDate) : undefined);
    setDialogTempAssignedUserId(item.assignedUserId || null);
    setDialogTempAssignedUserName(item.assignedUserName || null);
    setDialogTempAssignedUserAvatarUrl(item.assignedUserAvatarUrl || null);
    setDialogTempImageUrl(item.imageUrl || "");
    setDialogTempLabel(Array.isArray(item.label) ? item.label : []);
  };

  const handleCloseItemEditDialog = () => {
    setEditingItemAllDetails(null);
    // Reset all temp states
    setDialogTempTitle("");
    setDialogTempDescription("");
    setDialogTempCompleted(false);
    setDialogTempDueDate(undefined);
    setDialogTempAssignedUserId(null);
    setDialogTempAssignedUserName(null);
    setDialogTempAssignedUserAvatarUrl(null);
    setDialogTempImageUrl("");
    setDialogTempLabel([]);
    // Close any open popovers
    setIsUserPopoverOpen(false);
    setIsDueDatePopoverOpen(false);
    setIsLabelPopoverOpen(false);
    setIsAttachmentDialogOpen(false);
  };

  const handleSaveItemEditsFromMainDialog = () => {
    if (!editingItemAllDetails) return;

    if (dialogTempCompleted !== editingItemAllDetails.completed) {
      onToggleChecklistItem(task.id, editingItemAllDetails.id);
    }

    const trimmedTitle = dialogTempTitle.trim();
    if (!trimmedTitle) {
        toast({ title: "Title Required", description: "Checklist item title cannot be empty.", variant: "destructive" });
        setDialogTempTitle(editingItemAllDetails.title);
        return;
    }
    if (trimmedTitle !== editingItemAllDetails.title) {
      onUpdateChecklistItemTitle(task.id, editingItemAllDetails.id, trimmedTitle);
    }

    if (dialogTempDescription.trim() !== (editingItemAllDetails.description || "").trim()) {
      onUpdateChecklistItemDescription(task.id, editingItemAllDetails.id, dialogTempDescription.trim());
    }

    if ((dialogTempDueDate ? dialogTempDueDate.toISOString().split('T')[0] : null) !== (editingItemAllDetails.dueDate ? new Date(editingItemAllDetails.dueDate).toISOString().split('T')[0] : null)) {
      onSetChecklistItemDueDate(task.id, editingItemAllDetails.id, dialogTempDueDate || null);
    }

    if (dialogTempAssignedUserId !== editingItemAllDetails.assignedUserId) {
      onAssignUserToChecklistItem(task.id, editingItemAllDetails.id, dialogTempAssignedUserId, dialogTempAssignedUserName, dialogTempAssignedUserAvatarUrl);
    }

    const finalImageUrl = dialogTempImageUrl.trim() || null;
    let finalImageAiHint: string | null = null;
    if (finalImageUrl && trimmedTitle) {
        finalImageAiHint = trimmedTitle.split(/\s+/).slice(0, 2).join(' ').toLowerCase() || "image";
    }
    if (finalImageUrl !== editingItemAllDetails.imageUrl) {
        onSetChecklistItemImage(task.id, editingItemAllDetails.id, finalImageUrl, finalImageAiHint);
    }

    const currentLabels = editingItemAllDetails.label || [];
    const newLabels = dialogTempLabel;
    const labelsChanged = currentLabels.length !== newLabels.length || !currentLabels.every(label => newLabels.includes(label));

    if (labelsChanged) {
        onSetChecklistItemLabel(task.id, editingItemAllDetails.id, newLabels.length > 0 ? newLabels : []);
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

  const handleOpenAttachmentDialog = () => {
    if (!isOwner) return;
    if (attachmentDialogFileInpuRef.current) {
      attachmentDialogFileInpuRef.current.value = "";
    }
    setIsAttachmentDialogOpen(true);
  };

  const handleSaveAttachmentFromSubDialog = () => {
    setIsAttachmentDialogOpen(false);
  };

  const handleAttachmentFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File Too Large", description: "Please select an image smaller than 2MB.", variant: "destructive" });
        if (attachmentDialogFileInpuRef.current) attachmentDialogFileInpuRef.current.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setDialogTempImageUrl(reader.result as string);
      reader.onerror = () => toast({ title: "Error Reading File", variant: "destructive" });
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAttachmentInSubDialog = () => {
    setDialogTempImageUrl("");
    if (attachmentDialogFileInpuRef.current) attachmentDialogFileInpuRef.current.value = "";
  };

  const handleToggleDialogAssignCurrentUser = () => {
    if (!currentUser) return;
    if (dialogTempAssignedUserId === currentUser.id) {
      setDialogTempAssignedUserId(null);
      setDialogTempAssignedUserName(null);
      setDialogTempAssignedUserAvatarUrl(null);
    } else {
      setDialogTempAssignedUserId(currentUser.id);
      setDialogTempAssignedUserName(currentUser.displayName);
      setDialogTempAssignedUserAvatarUrl(currentUser.avatarUrl || null);
    }
    setIsUserPopoverOpen(false);
  };

  const handleSaveDueDateFromPopover = (date: Date | undefined) => {
    setDialogTempDueDate(date);
    setIsDueDatePopoverOpen(false);
  };

  const handleToggleLabelColorInDialog = (colorClass: string) => {
    setDialogTempLabel(prev => {
        const newLabels = prev.includes(colorClass)
            ? prev.filter(c => c !== colorClass)
            : [...prev, colorClass];
        
        if (newLabels.length > MAX_LABELS) {
            toast({title: "Label Limit Reached", description: `You can select up to ${MAX_LABELS} labels.`, variant: "default"});
            return prev;
        }
        return newLabels;
    });
  };
  const handleClearAllLabelsInDialog = () => {
    setDialogTempLabel([]);
    setIsLabelPopoverOpen(false);
  }


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
                            <CheckCircle2 className={cn("h-5 w-5", task.backgroundImageUrl ? "text-yellow-300" : "text-yellow-400")} />
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
                  "flex flex-col group/checklist text-sm rounded-md border overflow-hidden",
                  task.backgroundImageUrl ? "border-white/30 bg-white/10 text-gray-100" : "border-border/60 bg-card text-card-foreground",
                )}
              >
                {item.label && item.label.length > 0 && (
                    <div className="flex h-1.5 w-24">
                        {item.label.map((colorClass, index) => (
                            <div key={index} className={cn("h-full w-4", colorClass)} />
                        ))}
                    </div>
                )}
                <div
                  className={cn("p-1.5",isOwner && "cursor-pointer hover:bg-opacity-20", (!item.label || item.label.length === 0) && "pt-1.5" )}
                  onClick={(e) => {
                    if (!isOwner) return;
                    const target = e.target as HTMLElement;
                    if (target.closest('button[role="checkbox"]') || target.closest('[data-role="action-buttons-container"]')) {
                        return;
                    }
                    handleOpenItemEditDialog(item);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-grow min-w-0 relative">
                        <Checkbox
                        id={`checklist-${task.id}-${item.id}`}
                        checked={item.completed}
                        onCheckedChange={(checked) => onToggleChecklistItem(task.id, item.id)}
                        disabled={!isOwner}
                        className={cn(
                            "h-3.5 w-3.5 border-2 rounded-sm data-[state=checked]:bg-green-400 shrink-0",
                            task.backgroundImageUrl ? "border-gray-300 data-[state=checked]:text-gray-800" : "border-muted-foreground data-[state=checked]:text-primary-foreground",
                            !isOwner && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Toggle completion for ${item.title}`}
                        />
                        <label
                        htmlFor={`checklist-${task.id}-${item.id}`}
                        className={cn(
                            "flex-grow break-all truncate ml-2",
                            item.completed && "line-through opacity-70",
                            task.backgroundImageUrl ? "text-gray-100" : "text-card-foreground",
                            !isOwner && "pointer-events-none"
                        )}
                        >
                        {item.title}
                        </label>
                    </div>
                    {isOwner && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleOpenItemEditDialog(item); }}
                            className={cn("ml-2 p-0.5 rounded opacity-50 group-hover/checklist:opacity-100 focus:opacity-100 transition-opacity", task.backgroundImageUrl ? "text-gray-300 hover:text-white" : "text-muted-foreground hover:text-foreground")}
                            aria-label="Edit item details"
                        >
                            <Edit3Icon className="h-3.5 w-3.5" />
                        </button>
                    )}
                  </div>

                  {(item.imageUrl || item.description || item.dueDate || item.assignedUserId) && (
                    <div className={cn("mt-1 pt-1 text-xs flex flex-wrap gap-x-2 gap-y-1 items-start", task.backgroundImageUrl ? "text-gray-200" : "text-muted-foreground")}>
                        {item.imageUrl && (
                        <div className="w-full mt-1 mb-1 h-[45px] relative overflow-hidden rounded">
                            <Image
                                src={item.imageUrl}
                                alt={item.title || "Checklist item image"}
                                fill
                                style={{objectFit: "cover"}}
                                className="rounded"
                                data-ai-hint={item.imageAiHint || item.title.split(/\s+/).slice(0,2).join(' ').toLowerCase()}
                            />
                        </div>
                        )}
                        {item.description && (
                            <p
                                className="italic truncate w-full text-ellipsis text-gray-400/90 dark:text-gray-500/90"
                                dangerouslySetInnerHTML={{
                                __html: marked.parseInline(item.description.length > 50 ? `${item.description.substring(0, 47)}...` : item.description)
                                }}
                            />
                        )}
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
                            <AvatarFallback className={cn("text-xs", task.backgroundImageUrl ? "bg-white/30 text-white" : "bg-primary/20 text-primary")}>{item.assignedUserName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            {item.assignedUserName}
                        </div>
                        )}
                    </div>
                  )}
                </div>
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
             <DialogHeader className="pb-2">
                  <DialogTitle className="sr-only">
                    {`Edit item: ${dialogTempTitle || editingItemAllDetails.title || "Untitled Item"}`}
                  </DialogTitle>
                 <div className="flex items-center space-x-2">
                     <Checkbox
                        id={`dialog-item-completed-${editingItemAllDetails.id}`}
                        checked={dialogTempCompleted}
                        onCheckedChange={(checked) => setDialogTempCompleted(Boolean(checked))}
                        className={cn("h-5 w-5 rounded-full", task.backgroundImageUrl && "border-gray-400 data-[state=checked]:bg-green-400 data-[state=checked]:border-green-400")}
                      />
                     <EditableTitle
                        initialValue={dialogTempTitle}
                        onSave={(newTitle) => setDialogTempTitle(newTitle)}
                        isEditable={true}
                        textElement='div'
                        textClassName={cn(
                          "text-xl font-semibold py-1",
                          task.backgroundImageUrl && "text-gray-100",
                           dialogTempCompleted && "line-through text-muted-foreground"
                        )}
                        inputClassName={cn(
                          "text-xl font-semibold h-auto p-0",
                          task.backgroundImageUrl && "bg-transparent text-white placeholder-gray-300",
                           dialogTempCompleted && "line-through text-muted-foreground"
                        )}
                        placeholder="Item title..."
                        ariaLabel="Item title"
                        showEditIcon={true}
                        containerClassName="flex-grow"
                     />
                  </div>
            </DialogHeader>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("justify-start text-xs h-auto py-1.5", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20")}>
                            <UserCircleIcon className="mr-1.5 h-3.5 w-3.5" />
                            {dialogTempAssignedUserName || "Assign"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" side="bottom" align="start" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleToggleDialogAssignCurrentUser}>
                        {dialogTempAssignedUserId === currentUser?.id ? "Unassign Myself" : "Assign to Me"}
                        </Button>
                    </PopoverContent>
                </Popover>

                <Popover open={isDueDatePopoverOpen} onOpenChange={setIsDueDatePopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("justify-start text-xs h-auto py-1.5", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20")}>
                            <CalendarDaysIcon className="mr-1.5 h-3.5 w-3.5" />
                            {dialogTempDueDate ? format(dialogTempDueDate, "MMM d") : "Due Date"}
                            {dialogTempCompleted && dialogTempDueDate && (
                                <Badge variant="secondary" className={cn("ml-1.5 text-xs px-1 py-0", task.backgroundImageUrl ? "bg-green-300/30 text-green-100 border-green-300/50" : "bg-green-100 text-green-700")}>
                                   <CheckCircle2 className="mr-1 h-3 w-3"/> Done
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" side="bottom" align="start" onClick={(e) => e.stopPropagation()}>
                        <Calendar
                        mode="single"
                        selected={dialogTempDueDate}
                        onSelect={handleSaveDueDateFromPopover}
                        initialFocus
                        />
                        {dialogTempDueDate && <Button size="sm" variant="link" className="w-full text-xs text-destructive" onClick={() => {handleSaveDueDateFromPopover(undefined);}}>Clear Date</Button>}
                    </PopoverContent>
                </Popover>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAttachmentDialog}
                    className={cn("justify-start text-xs h-auto py-1.5", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20")}
                >
                    <PaperclipIcon className="mr-1.5 h-3.5 w-3.5" /> Image
                </Button>

                <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("justify-start text-xs items-center h-auto py-1.5", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20")}>
                            <TagIcon className="mr-1.5 h-3.5 w-3.5" />
                            Label
                            {dialogTempLabel.length > 0 && (
                                <div className="flex items-center gap-0.5 ml-1.5">
                                    {dialogTempLabel.slice(0, MAX_LABELS).map(color => ( 
                                        <span key={color} className={cn("w-2.5 h-2.5 rounded-sm", color)} />
                                    ))}
                                </div>
                            )}
                        </Button>
                    </PopoverTrigger>
                     <PopoverContent className="w-auto p-2" side="bottom" align="start" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                            {LABEL_COLORS.map(colorClass => (
                                <button
                                    key={colorClass}
                                    type="button"
                                    className={cn("w-5 h-5 rounded-md cursor-pointer hover:ring-2 hover:ring-offset-1 ring-ring", colorClass, dialogTempLabel.includes(colorClass) && "ring-2 ring-offset-1 ring-ring")}
                                    onClick={() => handleToggleLabelColorInDialog(colorClass)}
                                    aria-label={`Toggle label ${colorClass.split('-')[1]}`}
                                />
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs"
                            onClick={handleClearAllLabelsInDialog}
                            disabled={dialogTempLabel.length === 0}
                        >
                            Clear All Labels
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 flex-grow overflow-y-auto pb-3">
              <div className="md:col-span-2 space-y-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                        <AlignLeftIcon className={cn("h-4 w-4", task.backgroundImageUrl ? "text-gray-200" : "text-muted-foreground")} />
                        <Label htmlFor="dialogItemDescription" className={cn("text-sm", task.backgroundImageUrl && "text-gray-200")}>Description</Label>
                    </div>
                    <Textarea
                      id="dialogItemDescription"
                      value={dialogTempDescription}
                      onChange={(e) => setDialogTempDescription(e.target.value)}
                      placeholder="Add more details about this item... Markdown is supported for formatting (e.g. **bold**, *italic*, - lists)."
                      className={cn("min-h-[100px]",task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                      rows={3}
                    />
                  </div>
              </div>

              <div className="md:col-span-1 space-y-3 border-l border-border md:pl-6 mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0">
                <h4 className={cn("font-medium", task.backgroundImageUrl && "text-gray-200")}>Comments</h4>
                <div className={cn("p-3 rounded-md text-sm min-h-[150px] flex items-center justify-center", task.backgroundImageUrl ? "bg-white/5 text-gray-400 border border-white/20" : "bg-muted text-muted-foreground border border-dashed")}>
                   <MessageSquareIcon className="h-6 w-6 mr-2 opacity-50" /> Comments are coming soon!
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
              <Button onClick={handleSaveItemEditsFromMainDialog} className={cn(task.backgroundImageUrl && "bg-white/20 hover:bg-white/30 text-white")}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isOwner && editingItemAllDetails && (
        <Dialog open={isAttachmentDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setIsAttachmentDialogOpen(false); }}>
            <DialogContent
                className={cn("sm:max-w-md bg-card text-card-foreground", task.backgroundImageUrl && "bg-background/90 backdrop-blur-md border-white/40 text-white")}
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle className={cn(task.backgroundImageUrl && "text-white")}>Manage Item Image</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    {dialogTempImageUrl ? (
                        <div className="w-full h-40 relative overflow-hidden rounded-md border border-border">
                            <Image
                                src={dialogTempImageUrl}
                                alt={"Attachment preview"}
                                fill
                                style={{objectFit: "cover"}}
                                className="rounded-md"
                                data-ai-hint="image content"
                            />
                        </div>
                    ) : (
                        <div className="w-full h-24 flex items-center justify-center bg-muted rounded-md border border-dashed border-border">
                            <ImageIcon className={cn("h-10 w-10", task.backgroundImageUrl ? "text-gray-400" : "text-muted-foreground")} />
                        </div>
                    )}
                    <div>
                        <Label htmlFor="dialogAttachmentImageUrl" className={cn("text-xs", task.backgroundImageUrl && "text-gray-200")}>Image URL</Label>
                        <Input
                            id="dialogAttachmentImageUrl"
                            value={dialogTempImageUrl}
                            onChange={(e) => setDialogTempImageUrl(e.target.value)}
                            placeholder="https://example.com/image.png"
                            className={cn("text-sm h-9", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                        />
                    </div>
                    <div>
                        <Label htmlFor="dialogAttachmentImageFile" className={cn("text-xs", task.backgroundImageUrl && "text-gray-200")}>Or Upload Image (Max 2MB)</Label>
                        <Input
                            id="dialogAttachmentImageFile"
                            type="file"
                            accept="image/*"
                            ref={attachmentDialogFileInpuRef}
                            onChange={handleAttachmentFileChange}
                            className={cn("text-xs p-1 h-auto file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-input file:bg-transparent file:text-xs file:font-medium file:text-foreground", task.backgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 file:text-gray-200 file:border-white/30 hover:file:bg-white/5")}
                        />
                    </div>
                    {(dialogTempImageUrl) &&
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRemoveAttachmentInSubDialog}
                            className={cn("w-full mt-2 text-xs h-auto py-1.5", task.backgroundImageUrl ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300" : "border-destructive text-destructive hover:bg-destructive/5")}
                        >
                            <TrashIcon className="mr-2 h-3.5 w-3.5"/>Remove Current Image
                        </Button>
                    }
                </div>
                <DialogFooter className="pt-3">
                    <DialogClose asChild>
                         <Button variant="ghost" onClick={() => { setIsAttachmentDialogOpen(false); }} className={cn(task.backgroundImageUrl && "text-gray-300 hover:bg-white/10")}>Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={handleSaveAttachmentFromSubDialog}
                        className={cn(task.backgroundImageUrl && "bg-white/20 hover:bg-white/30 text-white")}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </Card>
  );
}

