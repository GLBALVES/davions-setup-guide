import { useEffect } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  isDirty: boolean;
  pendingNavigation: string | null;
  onSave: () => Promise<void> | void;
  onDiscard: () => void;
  onCancel: () => void;
}

export default function UnsavedChangesModal({ isDirty, pendingNavigation, onSave, onDiscard, onCancel }: Props) {
  const { t } = useLanguage();

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
          <AlertDialogTitle>{t.unsavedChanges.title}</AlertDialogTitle>
          <AlertDialogDescription>{t.unsavedChanges.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-2 sm:flex-row">
          <Button variant="outline" onClick={onCancel}>{t.unsavedChanges.cancel}</Button>
          <Button variant="destructive" onClick={onDiscard}>{t.unsavedChanges.discard}</Button>
          <Button onClick={onSave}>{t.unsavedChanges.save}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
