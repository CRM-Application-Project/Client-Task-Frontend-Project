"use client";
import { useState, useEffect } from "react";
import { X, Check, CheckCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageReceipt } from "@/app/services/chatService";
import UserAvatar from "./UserAvatar";

interface MessageInfoPopupProps {
  messageId: string;
  messageContent: string;
  timestamp: string;
  isOpen: boolean;
  onClose: () => void;
  onGetReceipts: (messageId: string) => Promise<MessageReceipt[]>;
}

export const MessageInfoPopup = ({
  messageId,
  messageContent,
  timestamp,
  isOpen,
  onClose,
  onGetReceipts
}: MessageInfoPopupProps) => {
  const [receipts, setReceipts] = useState<MessageReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && messageId) {
      fetchReceipts();
    }
  }, [isOpen, messageId]);

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const data = await onGetReceipts(messageId);
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusIconByStatus = (status: string) => {
    const upper = (status || '').toUpperCase();
    if (upper === 'READ') return <CheckCheck size={16} className="text-blue-500" />;
    if (upper === 'DELIVERED') return <CheckCheck size={16} className="text-gray-500" />;
    return <Check size={16} className="text-gray-400" />; // SENT -> single tick
  };

  const readReceipts = receipts.filter(r => (r as any).status?.toUpperCase() === 'READ');
  const deliveredReceipts = receipts.filter(r => (r as any).status?.toUpperCase() === 'DELIVERED');
  const sentReceipts = receipts.filter(r => (r as any).status?.toUpperCase() === 'SENT');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Message info</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 h-8 w-8 rounded-full hover:bg-gray-100"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Message Preview */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="bg-green-500 text-white rounded-lg p-3 max-w-xs ml-auto rounded-br-sm">
            <p className="text-sm whitespace-pre-wrap break-words">
              {messageContent}
            </p>
            <div className="flex items-center justify-end gap-1 mt-1 text-green-100">
              <span className="text-xs">{timestamp}</span>
              <CheckCheck size={12} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              <span className="ml-2 text-gray-600">Loading receipts...</span>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {/* Read Receipts */}
              {readReceipts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCheck size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-gray-700">
                      Read by {readReceipts.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {readReceipts.map((receipt, index) => (
                      <div key={index} className="flex items-center gap-3 py-2">
                        <UserAvatar
                          src={undefined}
                          alt={receipt.userName || 'User'}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {receipt.userName|| `User ${receipt.userId}`}
                          </p>
                          <p className="text-xs text-gray-600">
                            {formatTime(receipt.updatedAt)}
                          </p>
                        </div>
                        <CheckCheck size={14} className="text-blue-500" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivered Receipts */}
              {deliveredReceipts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCheck size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      Delivered to {deliveredReceipts.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {deliveredReceipts.map((receipt, index) => (
                      <div key={index} className="flex items-center gap-3 py-2">
                        <UserAvatar
                          src={undefined}
                          alt={receipt.userName || 'User'}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {receipt.userName || `User ${receipt.userId}`}
                          </p>
                          <p className="text-xs text-gray-600">
                            Delivered
                          </p>
                        </div>
                        <CheckCheck size={14} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sent Receipts */}
              {sentReceipts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCheck size={16} className="text-gray-300" />
                    <span className="text-sm font-medium text-gray-700">
                      Sent to {sentReceipts.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sentReceipts.map((receipt, index) => (
                      <div key={index} className="flex items-center gap-3 py-2">
                        <UserAvatar
                          src={undefined}
                          alt={receipt.userName || 'User'}
                          size="sm"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            {receipt.userName || `User ${receipt.userId}`}
                          </p>
                          <p className="text-xs text-gray-600">
                            Sent
                          </p>
                        </div>
                        <CheckCheck size={14} className="text-gray-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No receipts */}
              {receipts.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Clock size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">No receipt information available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};