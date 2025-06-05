
"use client";

import React, { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Edit3Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableTitleProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  isEditable: boolean;
  textElement?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  textClassName?: string; // For the displayed text itself
  inputClassName?: string; // For the input field
  editIconClassName?: string; // For the edit icon
  containerClassName?: string; // For the outer container of text + icon
  placeholder?: string;
  ariaLabel?: string;
  showEditIcon?: boolean;
}

export function EditableTitle({
  initialValue,
  onSave,
  isEditable,
  textElement: TextElement = 'div',
  textClassName,
  inputClassName,
  editIconClassName,
  containerClassName,
  placeholder = "Enter title...",
  ariaLabel = "Editable title",
  showEditIcon = true,
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setCurrentValue(initialValue);
    }
  }, [initialValue, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditable) {
      setIsEditing(true);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
  };

  const handleSave = () => {
    if (isEditable) {
        // Allow saving empty string if that's what user typed.
        // If current value is different from initial, or if initial was empty and current is now empty.
        if (currentValue.trim() !== initialValue.trim() || (initialValue.trim() === "" && currentValue.trim() === "")) {
            onSave(currentValue.trim());
        } else if (currentValue.trim() === "" && initialValue.trim() !== "") {
            // If user cleared a non-empty title, revert to initial to prevent accidental blanking if not intended.
            // Or, if saving truly blank titles is desired, this logic could be onSave("").
            setCurrentValue(initialValue);
        }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setCurrentValue(initialValue);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    // Don't save on blur if the click was on a dialog action button or similar.
    // This simple blur save might be too aggressive, consider if explicit save is better.
    handleSave();
  };

  if (isEditing && isEditable) {
    return (
      <Input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none",
          inputClassName 
        )}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <TextElement
      className={cn(
        "break-words group/editable-title relative",
        isEditable && "cursor-pointer hover:opacity-80 transition-opacity",
        containerClassName, // This is the main container for text + icon
        textClassName // This is for the text itself
      )}
      onClick={handleTextClick}
      title={isEditable ? "Click to edit" : undefined}
    >
      {currentValue || <span className="text-muted-foreground italic">{placeholder}</span>}
      {isEditable && showEditIcon && !isEditing && (
        <Edit3Icon
          className={cn(
            "inline-block ml-2 h-3 w-3 opacity-0 group-hover/editable-title:opacity-50 transition-opacity",
            editIconClassName
          )}
        />
      )}
    </TextElement>
  );
}
