"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SourceChangeDialogProps {
  open: boolean;
  onCancel: () => void;
  onSaveAndChange?: () => void;
  onConfirm: () => void;
}

export function SourceChangeDialog({
  open,
  onCancel,
  onSaveAndChange,
  onConfirm,
}: SourceChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Source?</DialogTitle>
          <DialogDescription>
            All your progress from Step 2 onwards (analysis, script, storyboard,
            generated assets) will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {onSaveAndChange && (
            <Button variant="outline" onClick={onSaveAndChange}>
              Save &amp; Change
            </Button>
          )}
          <Button variant="destructive" onClick={onConfirm}>
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
