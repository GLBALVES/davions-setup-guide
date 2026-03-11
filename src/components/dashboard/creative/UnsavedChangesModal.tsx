import { useEffect } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  isDirty: boolean;
  pendingNavigation: string | null;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({ isDirty, pendingNavigation, onSave, onDiscard, onCancel }: Props) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  if (!pendingNavigation) return null;

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Save your project?</AlertDialogTitle>
          <AlertDialogDescription>You have unsaved changes. What would you like to do?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onDiscard}>Leave without Saving</Button>
          <Button onClick={onSave}>Save and Leave</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
