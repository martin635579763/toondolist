
"use client";

import type { Task, ChecklistItem } from "@/types/task";
import type { User } from "@/types/user";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PrinterIcon, CalendarDaysIcon, PlusCircleIcon, Trash2Icon, Edit3Icon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";
import React, { useState, useEffect } from 'react'; // Added useEffect
import { EditableTitle } from "./EditableTitle";
import { marked } from 'marked';
import { ChecklistItemEditDialog } from "./ChecklistItemEditDialog";


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
  const [newChecklistItemTitle, setNewChecklistItemTitle] = useState("");
  const [editingItemAllDetails, setEditingItemAllDetails] = useState<ChecklistItem | null>(null);

  useEffect(() => {
    // This effect ensures that if the dialog is open and the underlying task data changes
    // (e.g., due to an update from within the dialog itself that modified page.tsx state),
    // the dialog receives the freshest version of the item.
    if (editingItemAllDetails && task.checklistItems) {
      const freshItemFromProps = task.checklistItems.find(
        (ci) => ci.id === editingItemAllDetails.id
      );

      if (freshItemFromProps) {
        // Compare by reference or a more robust method if needed (e.g., deep compare or lastUpdated timestamp)
        // For now, if the object reference from props is different, update our state.
        // This assumes that page.tsx always creates new item objects on update.
        if (freshItemFromProps !== editingItemAllDetails) {
          setEditingItemAllDetails(freshItemFromProps);
        }
      } else {
        // The item being edited was likely deleted from the main list, so close the dialog.
        setEditingItemAllDetails(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.checklistItems, editingItemAllDetails?.id]); // Rerun if checklistItems array changes or the ID of the item being edited changes (less likely for ID)
                                                 // Adding editingItemAllDetails itself can cause loops if not careful, so using its ID or the whole task.checklistItems.

  const handleAddChecklistItemSubmit = () => {
    if (newChecklistItemTitle.trim()) {
      onAddChecklistItem(task.id, newChecklistItemTitle.trim());
      setNewChecklistItemTitle("");
    }
  };
  
  const handleOpenItemEditDialog = (item: ChecklistItem) => {
    if (!isOwner) return;
    setEditingItemAllDetails(item);
  };

  const handleCloseItemEditDialog = () => {
    setEditingItemAllDetails(null);
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-badge-check", task.backgroundImageUrl ? "text-yellow-300" : "text-yellow-400")}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>
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
                  "flex flex-col group/item-area text-sm rounded-md border overflow-hidden",
                  task.backgroundImageUrl ? "border-white/30 bg-white/10 text-gray-100" : "border-border/60 bg-card text-card-foreground",
                )}
              >
                {item.label && item.label.length > 0 && (
                    <div className={cn("flex h-1.5 rounded-sm overflow-hidden w-36")}>
                        {item.label.map((colorClass, index) => (
                            <div key={index} className={cn("h-full w-6", colorClass)} />
                        ))}
                    </div>
                )}
                <div
                  className={cn("p-1.5",isOwner && "cursor-pointer", (!item.label || item.label.length === 0) && "pt-1.5" )}
                  onClick={(e) => {
                    if (!isOwner) return;
                    const target = e.target as HTMLElement;
                     if (
                        target.closest('[role="checkbox"]') ||
                        target.closest('[data-role="checkbox-label"]') ||
                        target.closest('[data-role="action-buttons-container"]')
                     ) {
                        return;
                    }
                    handleOpenItemEditDialog(item);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("flex items-center flex-grow min-w-0 relative")}>
                        <Checkbox
                        id={`checklist-${task.id}-${item.id}`}
                        checked={item.completed}
                        onCheckedChange={(checked) => onToggleChecklistItem(task.id, item.id)}
                        disabled={!isOwner}
                        className={cn(
                            "absolute left-0 top-1/2 -translate-y-1/2",
                            "h-3.5 w-3.5 border-2 rounded-sm data-[state=checked]:bg-green-400 shrink-0",
                            item.completed
                               ? "opacity-100"
                               : "opacity-0 group-hover/item-area:opacity-100 transition-opacity duration-300 ease-in-out",
                            task.backgroundImageUrl ? "border-gray-300 data-[state=checked]:text-gray-800" : "border-muted-foreground data-[state=checked]:text-primary-foreground"
                        )}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Toggle completion for ${item.title}`}
                        />
                        <label
                        htmlFor={`checklist-${task.id}-${item.id}`}
                        data-role="checkbox-label"
                        className={cn(
                            "flex-grow break-all truncate",
                            isOwner && "cursor-pointer", 
                            item.completed
                               ? "pl-5 line-through opacity-70" 
                               : "pl-1 group-hover/item-area:pl-5 transition-all duration-300 ease-in-out",
                            task.backgroundImageUrl ? "text-gray-100" : "text-card-foreground",
                            !isOwner && "pointer-events-none",
                            item.completed ? "line-through opacity-70" : ""
                        )}
                        >
                        {item.title}
                        </label>
                    </div>
                     <div className="flex items-center shrink-0 ml-2" data-role="action-buttons-container">
                        {isOwner && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleOpenItemEditDialog(item); }}
                                className={cn("p-0.5 rounded opacity-0 group-hover/item-area:opacity-100 focus:opacity-100 transition-opacity", task.backgroundImageUrl ? "text-gray-300 hover:text-white" : "text-muted-foreground hover:text-foreground")}
                                aria-label="Edit item details"
                            >
                                <Edit3Icon className="h-3.5 w-3.5" />
                            </button>
                        )}
                        {isOwner && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteChecklistItem(task.id, item.id);
                                }}
                                className={cn(
                                    "p-0.5 rounded opacity-0 group-hover/item-area:opacity-100 focus:opacity-100 transition-opacity text-destructive hover:bg-destructive/10 ml-1",
                                    task.backgroundImageUrl ? "hover:text-red-400" : "hover:text-destructive"
                                )}
                                aria-label="Delete item"
                            >
                                <Trash2Icon className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                  </div>

                  {(item.imageUrl || item.description || item.dueDate || item.assignedUserId) && (
 <div className={cn("mt-1 pt-1 text-xs flex flex-col gap-y-1 items-start", task.backgroundImageUrl ? "text-gray-200" : "text-muted-foreground")}>
                        {item.imageUrl && (
 <div className="w-full mt-1 mb-1 relative max-h-48 overflow-hidden rounded">
 <Image 
 src={item.imageUrl}
 alt={item.title || "Checklist item image"}
 width={500} // Set a reasonable width, or make it dynamic
 height={300} // Set a reasonable height, or make it dynamic
 style={{objectFit: "contain", width: "100%", height: "auto"}} // Use "contain" to show full image, auto height to maintain aspect ratio
 className="rounded"
 data-ai-hint={item.imageAiHint || item.title.split(/\s+/).slice(0,2).join(' ').toLowerCase()}
 />
 </div>
                        )}
                        {item.description && (
 <p
 className={cn("italic w-full text-gray-400/90 dark:text-gray-500/90", item.imageUrl ? "mt-2" : "")} // Added margin top if there's an image above
 dangerouslySetInnerHTML={{
 __html: marked.parseInline(item.description) // Show full description
 }}
 />
                        )}
                        {item.dueDate && (
 <div className={cn("flex items-center mt-1", // Added margin top
 item.completed ?
 (task.backgroundImageUrl ? "text-green-300" : "text-green-600 dark:text-green-400") :
 (task.backgroundImageUrl ? "text-gray-200" : "text-muted-foreground")
 )}
                        >
 <CalendarDaysIcon className="mr-1 h-3 w-3" />
 {format(new Date(item.dueDate), "MMM d")}
 </div>
                        )}
                        {item.assignedUserId && item.assignedUserName && (
                        <div className="flex items-center">
                             <Image
                                src={item.assignedUserAvatarUrl || `https://placehold.co/20x20.png?text=${item.assignedUserName.charAt(0).toUpperCase()}`}
                                alt={item.assignedUserName}
                                width={16}
                                height={16}
                                className="rounded-full mr-1"
                                data-ai-hint="user"
                            />
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
        <ChecklistItemEditDialog
          isOpen={!!editingItemAllDetails}
          onOpenChange={(open) => { if (!open) handleCloseItemEditDialog(); }}
          item={editingItemAllDetails}
          taskId={task.id}
          currentUser={currentUser}
          isOwner={isOwner}
          taskBackgroundImageUrl={task.backgroundImageUrl}
          onToggleChecklistItem={onToggleChecklistItem}
          onUpdateChecklistItemTitle={onUpdateChecklistItemTitle}
          onUpdateChecklistItemDescription={onUpdateChecklistItemDescription}
          onSetChecklistItemDueDate={onSetChecklistItemDueDate}
          onAssignUserToChecklistItem={onAssignUserToChecklistItem}
          onSetChecklistItemImage={onSetChecklistItemImage}
          onSetChecklistItemLabel={onSetChecklistItemLabel}
        />
      )}
    </Card>
  );
}

