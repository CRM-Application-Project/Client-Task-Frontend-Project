"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ChangeStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leadName: string;
  currentStatus: string;
  newStatus: string;
  message: string;
  onMessageChange: (message: string) => void;
}

export const ChangeStatusConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  leadName,
  currentStatus,
  newStatus,
  message,
  onMessageChange,
}: ChangeStatusConfirmModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Lead Status</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Are you sure you want to change the status of{" "}
              <span className="font-semibold text-gray-900">{leadName}</span> from{" "}
              <span className="font-semibold text-blue-600">{currentStatus}</span> to{" "}
              <span className="font-semibold text-green-600">{newStatus}</span>?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-message" className="text-sm font-medium">
              Add a message :
            </Label>
            <Textarea
              id="status-message"
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="Enter any notes about this status change..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              This message will be included in the status change history.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
          >
            Confirm Status Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};