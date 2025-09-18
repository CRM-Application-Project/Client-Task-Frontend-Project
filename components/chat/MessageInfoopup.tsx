// components/MessageInfoPopup.tsx
import { X, Check, CheckCheck, Clock, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MessageReceipt {
  id: string;
  messageId: string;
  userId: string;
  userName: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  timestamp: string;
}

interface MessageInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
  receipts: MessageReceipt[];
  messageContent: string;
  messageTimestamp: string;
  senderName: string;
}

export const MessageInfoPopup = ({
  isOpen,
  onClose,
  receipts,
  messageContent,
  messageTimestamp,
  senderName
}: MessageInfoPopupProps) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Check size={16} className="text-gray-500" />;
      case 'DELIVERED':
        return <CheckCheck size={16} className="text-gray-500" />;
      case 'READ':
        return <CheckCheck size={16} className="text-blue-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'Sent';
      case 'DELIVERED':
        return 'Delivered';
      case 'READ':
        return 'Read';
      default:
        return 'Pending';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Group receipts by status for better organization
  const groupedReceipts = {
    READ: receipts.filter(r => r.status === 'READ'),
    DELIVERED: receipts.filter(r => r.status === 'DELIVERED'),
    SENT: receipts.filter(r => r.status === 'SENT')
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Message Info</DialogTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </DialogHeader>

        {/* Message Preview */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700 mb-2">{messageContent}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>From: {senderName}</span>
            <span>{formatTime(messageTimestamp)} • {formatDate(messageTimestamp)}</span>
          </div>
        </div>

        {/* Receipts Information */}
        <div className="space-y-4">
          {Object.entries(groupedReceipts).map(([status, statusReceipts]) => 
            statusReceipts.length > 0 && (
              <div key={status}>
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  {getStatusIcon(status)}
                  {getStatusText(status)} ({statusReceipts.length})
                </h3>
                <div className="space-y-2">
                  {statusReceipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <User size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{receipt.userName}</p>
                          <p className="text-xs text-gray-500">{receipt.userId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600">{formatTime(receipt.timestamp)}</p>
                        <p className="text-xs text-gray-500">{formatDate(receipt.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {receipts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Clock size={32} className="mx-auto mb-2" />
            <p>No receipt information available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};