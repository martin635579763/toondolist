
"use client";

import type React from 'react';
import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import type { ChecklistItem, ActivityLogEntry } from "@/types/task";
import type { User } from "@/types/user";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { EditableTitle } from "./EditableTitle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { AlignLeftIcon, CalendarDaysIcon, CheckCircle2, HistoryIcon, ImageIcon, PaperclipIcon, TagIcon, TrashIcon, UserCircleIcon, UserIcon } from 'lucide-react';

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

interface ChecklistItemEditDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: ChecklistItem;
  taskId: string;
  currentUser: User | null;
  isOwner: boolean;
  taskBackgroundImageUrl?: string; 

  onToggleChecklistItem: (taskId: string, itemId: string) => void;
  onUpdateChecklistItemTitle: (taskId: string, itemId: string, newTitle: string) => void;
  onUpdateChecklistItemDescription: (taskId: string, itemId: string, newDescription: string) => void;
  onSetChecklistItemDueDate: (taskId: string, itemId: string, date: Date | null) => void;
  onAssignUserToChecklistItem: (taskId: string, itemId: string, userId: string | null, userName: string | null, userAvatarUrl: string | null) => void;
  onSetChecklistItemImage: (taskId: string, itemId: string, imageUrl: string | null, imageAiHint: string | null) => void;
  onSetChecklistItemLabel: (taskId: string, itemId: string, newLabels: string[] | null) => void;
}

export function ChecklistItemEditDialog({
  isOpen,
  onOpenChange,
  item,
  taskId,
  currentUser,
  isOwner,
  taskBackgroundImageUrl,
  onToggleChecklistItem,
  onUpdateChecklistItemTitle,
  onUpdateChecklistItemDescription,
  onSetChecklistItemDueDate,
  onAssignUserToChecklistItem,
  onSetChecklistItemImage,
  onSetChecklistItemLabel,
}: ChecklistItemEditDialogProps) {
  const { toast } = useToast();

  const [dialogTempTitle, setDialogTempTitle] = useState(item.title);
  const [dialogTempDescription, setDialogTempDescription] = useState(item.description || "");
  const [dialogTempCompleted, setDialogTempCompleted] = useState(item.completed);
  const [dialogTempDueDate, setDialogTempDueDate] = useState<Date | undefined>(item.dueDate ? new Date(item.dueDate) : undefined);
  const [dialogTempAssignedUserId, setDialogTempAssignedUserId] = useState<string | null>(item.assignedUserId || null);
  const [dialogTempAssignedUserName, setDialogTempAssignedUserName] = useState<string | null>(item.assignedUserName || null);
  const [dialogTempAssignedUserAvatarUrl, setDialogTempAssignedUserAvatarUrl] = useState<string | null>(item.assignedUserAvatarUrl || null);
  const [dialogTempImageUrl, setDialogTempImageUrl] = useState<string>(item.imageUrl || "");
  const [dialogTempLabel, setDialogTempLabel] = useState<string[]>(Array.isArray(item.label) ? item.label : []);

  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const attachmentDialogFileInpuRef = useRef<HTMLInputElement>(null);
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);
  const [isDueDatePopoverOpen, setIsDueDatePopoverOpen] = useState(false);
  const [isLabelPopoverOpen, setIsLabelPopoverOpen] = useState(false);

  useEffect(() => {
    setDialogTempTitle(item.title);
    setDialogTempDescription(item.description || "");
    setDialogTempCompleted(item.completed);
    setDialogTempDueDate(item.dueDate ? new Date(item.dueDate) : undefined);
    setDialogTempAssignedUserId(item.assignedUserId || null);
    setDialogTempAssignedUserName(item.assignedUserName || null);
    setDialogTempAssignedUserAvatarUrl(item.assignedUserAvatarUrl || null);
    setDialogTempImageUrl(item.imageUrl || "");
    setDialogTempLabel(Array.isArray(item.label) ? item.label : []);
  }, [item]);


  const handleSaveItemEdits = () => {
    if (!isOwner || !currentUser) return;

    const trimmedTitle = dialogTempTitle.trim();
    if (!trimmedTitle) {
        toast({ title: "Title Required", description: "Checklist item title cannot be empty.", variant: "destructive" });
        setDialogTempTitle(item.title); 
        return; 
    }
    if (trimmedTitle !== item.title) {
      onUpdateChecklistItemTitle(taskId, item.id, trimmedTitle);
    }

    if (dialogTempDescription.trim() !== (item.description || "").trim()) {
      onUpdateChecklistItemDescription(taskId, item.id, dialogTempDescription.trim());
    }
    
    // Compare completed status after title/desc, as onToggleChecklistItem might be called by checkbox directly
    // However, the dialog's internal 'dialogTempCompleted' is the source of truth for this save operation.
    if (dialogTempCompleted !== item.completed) {
        onToggleChecklistItem(taskId, item.id); // This will toggle based on item.completed, so if it's already been externally toggled, this makes it right
    }
    
    const newDueDateStr = dialogTempDueDate ? dialogTempDueDate.toISOString().split('T')[0] : null;
    const currentDueDateStr = item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : null;
    if (newDueDateStr !== currentDueDateStr) {
        onSetChecklistItemDueDate(taskId, item.id, dialogTempDueDate || null);
    }

    if (dialogTempAssignedUserId !== item.assignedUserId) {
      onAssignUserToChecklistItem(taskId, item.id, dialogTempAssignedUserId, dialogTempAssignedUserName, dialogTempAssignedUserAvatarUrl);
    }

    const finalImageUrl = dialogTempImageUrl.trim() || null;
    let finalImageAiHint: string | null = null;
    if (finalImageUrl && trimmedTitle) {
        finalImageAiHint = trimmedTitle.split(/\s+/).slice(0, 2).join(' ').toLowerCase() || "image";
    }
    if (finalImageUrl !== item.imageUrl) {
        onSetChecklistItemImage(taskId, item.id, finalImageUrl, finalImageAiHint);
    }

    const currentLabels = item.label || [];
    const newLabels = dialogTempLabel;
    const labelsChanged = currentLabels.length !== newLabels.length || !currentLabels.every(label => newLabels.includes(label));

    if (labelsChanged) {
        onSetChecklistItemLabel(taskId, item.id, newLabels.length > 0 ? newLabels : []);
    }
  };

  const handleDialogClose = (openState: boolean) => {
    if (!openState) { 
      if(isOwner) handleSaveItemEdits();
      setIsUserPopoverOpen(false);
      setIsDueDatePopoverOpen(false);
      setIsLabelPopoverOpen(false);
      setIsAttachmentDialogOpen(false);
    }
    onOpenChange(openState);
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
    // The actual image URL update will happen on main dialog close via handleSaveItemEdits
  };

  const handleAttachmentFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
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
    if (!currentUser || !isOwner) return;
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
    if (!isOwner) return;
    setDialogTempDueDate(date);
    setIsDueDatePopoverOpen(false);
  };

  const handleToggleLabelColorInDialog = (colorClass: string) => {
    if (!isOwner) return;
    setDialogTempLabel(prev => {
        const isSelected = prev.includes(colorClass);
        if (isSelected) {
            return prev.filter(c => c !== colorClass);
        } else {
            if (prev.length < MAX_LABELS) {
                return [...prev, colorClass];
            } else {
                toast({title: "Label Limit Reached", description: `You can select up to ${MAX_LABELS} labels.`, variant: "default"});
                return prev;
            }
        }
    });
  };
  
  const handleClearAllLabelsInDialog = () => {
    if (!isOwner) return;
    setDialogTempLabel([]);
    setIsLabelPopoverOpen(false);
  }

  if (!isOwner && !isOpen) return null; 

  return (
    <>
      <Dialog 
          open={isOpen} 
          onOpenChange={handleDialogClose}
      >
        <DialogContent
          className={cn("sm:max-w-3xl bg-card text-card-foreground max-h-[90vh] flex flex-col", taskBackgroundImageUrl && "bg-background/90 backdrop-blur-md border-white/40 text-white")}
          onClick={(e) => e.stopPropagation()}
        >
           <DialogHeader className="pb-2 pr-10">
                 <DialogTitle className="sr-only">
                  {`Edit item: ${dialogTempTitle || item.title || "Untitled Item"}`}
                </DialogTitle>
               <div className="flex items-center space-x-2">
                   <Checkbox
                      id={`dialog-item-completed-${item.id}`}
                      checked={dialogTempCompleted}
                      onCheckedChange={(checked) => {
                        if (isOwner) {
                          setDialogTempCompleted(Boolean(checked));
                          // No direct call to onToggleChecklistItem here, it's handled in handleSaveItemEdits
                        }
                      }}
                      disabled={!isOwner}
                      className={cn("h-5 w-5 rounded-sm", taskBackgroundImageUrl && "border-gray-400 data-[state=checked]:bg-green-400 data-[state=checked]:border-green-400")}
                    />
                   <EditableTitle
                      initialValue={dialogTempTitle}
                      onSave={(newTitle) => isOwner && setDialogTempTitle(newTitle)} // This just updates local dialog state
                      isEditable={isOwner}
                      textElement='div'
                      textClassName={cn(
                        "text-xl font-semibold py-1",
                        taskBackgroundImageUrl && "text-gray-100",
                        dialogTempCompleted && "line-through text-muted-foreground"
                      )}
                      inputClassName={cn(
                        "text-xl font-semibold h-auto p-0",
                        taskBackgroundImageUrl && "bg-transparent text-white placeholder-gray-300",
                        dialogTempCompleted && "line-through text-muted-foreground"
                      )}
                      placeholder="Item title..."
                      ariaLabel="Item title"
                      showEditIcon={true}
                      containerClassName="flex-grow"
                   />
                </div>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 flex-grow overflow-y-auto min-h-[300px]">
            <div className="md:col-span-2 space-y-4 pr-4 md:border-r md:border-border/50">
              {dialogTempImageUrl && (
                  <div className="w-full h-48 relative overflow-hidden rounded-md border border-border">
                      <Image
                          src={dialogTempImageUrl}
                          alt={dialogTempTitle || "Item image"}
                          fill
                          style={{objectFit: "cover"}}
                          className="rounded-md"
                          data-ai-hint={item.imageAiHint || dialogTempTitle.split(/\s+/).slice(0,2).join(' ').toLowerCase()}
                      />
                  </div>
              )}
              <div>
                <div className="flex items-center space-x-2 mb-1.5">
                    <AlignLeftIcon className={cn("h-4 w-4", taskBackgroundImageUrl ? "text-gray-200" : "text-muted-foreground")} />
                    <Label htmlFor="dialogItemDescription" className={cn("text-sm font-medium", taskBackgroundImageUrl && "text-gray-200")}>Description</Label>
                </div>
                <Textarea
                  id="dialogItemDescription"
                  value={dialogTempDescription}
                  onChange={(e) => isOwner && setDialogTempDescription(e.target.value)}
                  placeholder="Add more details about this item... Markdown is supported for formatting (e.g. **bold**, *italic*, - lists)."
                  className={cn(
                      "min-h-[150px] text-sm",
                      taskBackgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50"
                  )}
                  rows={dialogTempImageUrl ? 4 : 8}
                  disabled={!isOwner}
                />
              </div>
            </div>

            <div className="md:col-span-1 space-y-4 pl-0 md:pl-4 mt-4 md:mt-0">
              <h4 className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground", taskBackgroundImageUrl && "text-gray-300")}>Actions</h4>
              <div className="space-y-2 flex flex-col items-start">
                  <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-full justify-start text-xs h-auto py-1.5 px-2", taskBackgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20")} disabled={!isOwner}>
                              <UserCircleIcon className="mr-1.5 h-3.5 w-3.5" />
                              {dialogTempAssignedUserName ? dialogTempAssignedUserName.split(' ')[0] : "Assign User"}
                          </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" side="bottom" align="start" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleToggleDialogAssignCurrentUser} disabled={!isOwner}>
                          {dialogTempAssignedUserId === currentUser?.id ? "Unassign Myself" : "Assign to Me"}
                          </Button>
                      </PopoverContent>
                  </Popover>

                  <Popover open={isDueDatePopoverOpen} onOpenChange={setIsDueDatePopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button 
                              variant="outline" 
                              size="sm" 
                              className={cn(
                                  "w-full justify-start text-xs h-auto py-1.5 px-2",
                                  dialogTempCompleted && dialogTempDueDate 
                                  ? (taskBackgroundImageUrl ? "text-green-300 bg-white/10 border-white/30 hover:bg-white/20" : "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300")
                                  : (taskBackgroundImageUrl ? "bg-white/10 border-white/30 text-white hover:bg-white/20" : "")
                              )}
                              disabled={!isOwner}
                          >
                              <CalendarDaysIcon className={cn("mr-1.5 h-3.5 w-3.5")} />
                              {dialogTempDueDate ? format(dialogTempDueDate, "MMM d, yyyy") : "Set Due Date"}
                              {dialogTempCompleted && dialogTempDueDate && (
                                  <Badge variant="secondary" className={cn("ml-1.5 text-xs px-1 py-0", taskBackgroundImageUrl ? "bg-green-300/30 text-green-100 border-green-300/50" : "bg-green-100 text-green-700")}>
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
                          disabled={!isOwner}
                          initialFocus
                          />
                          {dialogTempDueDate && <Button size="sm" variant="link" className="w-full text-xs text-destructive" onClick={() => {handleSaveDueDateFromPopover(undefined);}} disabled={!isOwner}>Clear Date</Button>}
                      </PopoverContent>
                  </Popover>

                  <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAttachmentDialog}
                      className={cn("w-full justify-start text-xs h-auto py-1.5 px-2", taskBackgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20")}
                      disabled={!isOwner}
                  >
                      <PaperclipIcon className="mr-1.5 h-3.5 w-3.5" /> {dialogTempImageUrl ? "Change Image" : "Add Image"}
                  </Button>

                  <Popover open={isLabelPopoverOpen} onOpenChange={setIsLabelPopoverOpen}>
                      <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("w-full justify-start text-xs items-center h-auto py-1.5 px-2", taskBackgroundImageUrl && "bg-white/10 border-white/30 text-white hover:bg-white/20")} disabled={!isOwner}>
                              <TagIcon className="mr-1.5 h-3.5 w-3.5" />
                              Labels
                              {dialogTempLabel.length > 0 && (
                                  <div className="flex items-center gap-0.5 ml-auto pl-1">
                                      {dialogTempLabel.slice(0, MAX_LABELS).map(color => ( 
                                          <span key={color} className={cn("w-2.5 h-2.5 rounded-sm block", color)} />
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
                                      disabled={!isOwner}
                                  />
                              ))}
                          </div>
                          <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              onClick={handleClearAllLabelsInDialog}
                              disabled={!isOwner || dialogTempLabel.length === 0}
                          >
                              Clear All Labels
                          </Button>
                      </PopoverContent>
                  </Popover>
              </div>
              
              <Separator className={cn("my-3", taskBackgroundImageUrl && "bg-white/20")} />

              <div>
                <h4 className={cn("text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center", taskBackgroundImageUrl && "text-gray-300")}>
                    <HistoryIcon className="h-3.5 w-3.5 mr-1.5" /> Activity
                </h4>
                <ScrollArea className="h-[150px] pr-2">
                  {(item.activityLog && item.activityLog.length > 0) ? (
                    <div className="space-y-2.5 text-xs">
                      {item.activityLog.map((log: ActivityLogEntry) => (
                        <div key={log.id} className={cn("flex items-start space-x-2", taskBackgroundImageUrl ? "text-gray-300" : "text-muted-foreground")}>
                          <Avatar className="h-5 w-5 mt-0.5 shrink-0">
                            <AvatarImage 
                                src={currentUser?.id === item.actorName.split(" ")[0] ? currentUser.avatarUrl : undefined} // Simplistic check, assumes actorName starts with current user's ID
                                alt={log.actorName} 
                                data-ai-hint="user avatar"
                            />
                            <AvatarFallback className={cn("text-[10px]", taskBackgroundImageUrl ? "bg-white/20 text-gray-200" : "bg-muted")}>
                                {log.actorName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-grow">
                            <p className={cn(taskBackgroundImageUrl ? "text-gray-200" : "text-foreground/90")}>
                              <span className="font-medium">{log.actorName}</span> {log.action}
                            </p>
                            {log.details && <p className={cn("text-xs italic", taskBackgroundImageUrl ? "text-gray-400" : "text-muted-foreground/80")}>{log.details}</p>}
                            <p className={cn("text-[10px]", taskBackgroundImageUrl ? "text-gray-400" : "text-muted-foreground/70")}>
                              {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={cn("p-3 rounded-md text-xs min-h-[100px] flex flex-col items-center justify-center border border-dashed", taskBackgroundImageUrl ? "bg-white/5 text-gray-400 border-white/20" : "bg-muted text-muted-foreground")}>
                      <HistoryIcon className="h-6 w-6 mb-2 opacity-50" />
                      No activity yet for this item.
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isOwner && (
        <Dialog open={isAttachmentDialogOpen} onOpenChange={(open) => { if (!open) setIsAttachmentDialogOpen(false); }}>
            <DialogContent
                className={cn("sm:max-w-md bg-card text-card-foreground", taskBackgroundImageUrl && "bg-background/90 backdrop-blur-md border-white/40 text-white")}
                onClick={(e) => e.stopPropagation()}
            >
                <DialogHeader>
                    <DialogTitle className={cn(taskBackgroundImageUrl && "text-white")}>Manage Item Image</DialogTitle>
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
                            <ImageIcon className={cn("h-10 w-10", taskBackgroundImageUrl ? "text-gray-400" : "text-muted-foreground")} />
                        </div>
                    )}
                    <div>
                        <Label htmlFor="dialogAttachmentImageUrl" className={cn("text-xs", taskBackgroundImageUrl && "text-gray-200")}>Image URL</Label>
                        <Input
                            id="dialogAttachmentImageUrl"
                            value={dialogTempImageUrl}
                            onChange={(e) => setDialogTempImageUrl(e.target.value)}
                            placeholder="https://example.com/image.png"
                            className={cn("text-sm h-9", taskBackgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 focus:border-white/50")}
                        />
                    </div>
                    <div>
                        <Label htmlFor="dialogAttachmentImageFile" className={cn("text-xs", taskBackgroundImageUrl && "text-gray-200")}>Or Upload Image (Max 2MB)</Label>
                        <Input
                            id="dialogAttachmentImageFile"
                            type="file"
                            accept="image/*"
                            ref={attachmentDialogFileInpuRef}
                            onChange={handleAttachmentFileChange}
                            className={cn("text-xs p-1 h-auto file:mr-2 file:py-1 file:px-2 file:rounded-md file:border file:border-input file:bg-transparent file:text-xs file:font-medium file:text-foreground", taskBackgroundImageUrl && "bg-white/10 border-white/30 text-white placeholder-gray-400 file:text-gray-200 file:border-white/30 hover:file:bg-white/5")}
                        />
                    </div>
                    {(dialogTempImageUrl) &&
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRemoveAttachmentInSubDialog}
                            className={cn("w-full mt-2 text-xs h-auto py-1.5", taskBackgroundImageUrl ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-300" : "border-destructive text-destructive hover:bg-destructive/5")}
                        >
                            <TrashIcon className="mr-2 h-3.5 w-3.5"/>Remove Current Image
                        </Button>
                    }
                </div>
                <DialogFooter className="pt-3">
                    <DialogClose asChild>
                         <Button variant="ghost" onClick={() => { setIsAttachmentDialogOpen(false); }} className={cn(taskBackgroundImageUrl && "text-gray-300 hover:bg-white/10")}>Cancel</Button>
                    </DialogClose>
                    <Button
                        onClick={handleSaveAttachmentFromSubDialog}
                        className={cn(taskBackgroundImageUrl && "bg-white/20 hover:bg-white/30 text-white")}
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
