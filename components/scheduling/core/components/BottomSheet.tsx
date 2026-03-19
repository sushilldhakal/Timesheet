import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="bottom" showCloseButton={false}>
        {children}
      </SheetContent>
    </Sheet>
  );
}