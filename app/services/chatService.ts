import { API_CONSTANTS } from "./api.route";
import { deleteRequest, getRequest, postRequest, putRequest } from "./httpServices";

export interface ChatParticipant {
  id: string;
  label: string;
  conversationRole: "ADMIN" | "MEMBER"; 
  status:"online" | "offline" | "away";
  avatar?: string;
  // or other roles as needed
}
export interface Chat {
  id: number;
  name: string;
  description: string;
  unReadMessageCount: number;
  conversationType: string;
  participants: ChatParticipant[];
  messageResponses: any;
  lastMessage?: {
    content: string;
    timestamp: string | Date;
    senderId: string;
  };
}

export interface GetChatListResponse {
  isSuccess: boolean;
  message: string;
  data: Chat[];
}

export interface StartConversationPayload {
  name: string;
  description: string;
  conversationType: "PRIVATE" | "GROUP";
  participants: string[]; // array of user IDs
}

export interface StartConversationResponse {
  isSuccess: boolean;
  message: string;
  data: Chat; // The created chat object
}
export interface MessageFileInfo {
  fileName: string;
  fileType: string;
}
// Service functions
export const getChatList = async (): Promise<GetChatListResponse> => {
  const res = await getRequest(API_CONSTANTS.CHAT_MODULE.GET_CHAT_LIST);
  return res as GetChatListResponse;
};

export const startConversation = async (
  payload: StartConversationPayload
): Promise<StartConversationResponse> => {
  const res = await postRequest(API_CONSTANTS.CHAT_MODULE.START, payload);
  return res as StartConversationResponse;
};
export interface SoftDeleteResponse {
  isSuccess: boolean;
  message: string;
  data?: any;
}

// Service function for soft delete (no payload needed)
export const softDeleteConversation = async (
  conversationId: string | number
): Promise<SoftDeleteResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.SOFT_DELETE(conversationId);
  const res = await deleteRequest(url);
  return res as SoftDeleteResponse;
};
export interface AddParticipantsPayload {
  participants: string[]; // array of user IDs like ["UR-ID239604"]
}

export interface AddParticipantsResponse {
  isSuccess: boolean;
  message: string;
  data?: any; // Can be more specific if you know the response structure
}

// Service function for adding participants
export const addParticipants = async (
  conversationId: string | number,
  payload: AddParticipantsPayload
): Promise<AddParticipantsResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.ADD_PARTICIPANTS(conversationId);
  const res = await postRequest(url, payload);
  return res as AddParticipantsResponse;
};
export interface DeleteParticipantsPayload {
  participants: string[]; // array of user IDs like ["UR-ID239604"]
}

export interface DeleteParticipantsResponse {
  isSuccess: boolean;
  message: string;
  data?: any;
}

// Service function for deleting participants
export const deleteParticipants = async (
  conversationId: string | number,
  payload: DeleteParticipantsPayload
): Promise<DeleteParticipantsResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.DELETE_PARTICIPANTS(conversationId);
  const res = await deleteRequest<DeleteParticipantsResponse>(url, payload);
  return res;
};
export interface ChangeRolePayload {
  role: "ADMIN" | "MEMBER"; // or other roles as needed
  participantId: string;
}

export interface ChangeRoleResponse {
  isSuccess: boolean;
  message: string;
  data?: any;
}

// Service function for changing participant role
export const changeParticipantRole = async (
  conversationId: string | number,
  payload: ChangeRolePayload
): Promise<ChangeRoleResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.CHANGE_ROLE(conversationId);
  const res = await putRequest<ChangeRoleResponse>(url, payload);
  return res;
};
// Interfaces
export interface MessageSender {
  id: string;
  label: string;
}

export interface Message {
  id: number;
  parentId: number | null;
  conversationId: number;
  content: string;
  createdAt: string;
  sender: MessageSender;
  replyCount: number;
  mentions: string[];
  reactions: any[]; // Can refine later if needed
  attachments: any | null; // Can refine later if needed
  deletable: boolean;
  updatable: boolean;
}

export interface AddMessageResponse {
  isSuccess: boolean;
  message: string;
  data: Message;
}

export interface AddMessagePayload {
  conversationId: number;
  content: string;
  mentions?: string[];
  parentId?: number;
  fileInfo?: MessageFileInfo[]; // ✅ new field for attachments
}

// Service function for adding a message (remains the same)
export const addMessage = async (
  payload: AddMessagePayload
): Promise<AddMessageResponse> => {
  const res = await postRequest<AddMessageResponse>(API_CONSTANTS.CHAT_MODULE.MESSAGE.ADD, payload);
  return res;
};
export interface FilterMessagesParams {
  conversationId: string | number;
  parentId?: string | number;
  searchTerm?: string;
}

export interface FilterMessagesResponse {
  isSuccess: boolean;
  message: string;
  data: {
    totalPages: number;
    totalElements: number;
    pageSize: number;
    pageIndex: number;
    numberOfElementsInThePage: number;
    content: Message[];
  };
}

// Service function for filtering messages
export const filterMessages = async (
  params: FilterMessagesParams
): Promise<FilterMessagesResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.FILTER(
    params.conversationId,
    params.parentId,
    params.searchTerm
  );
  
  const res = await getRequest<FilterMessagesResponse>(url);
  return res;
};

// Alternative approach with individual parameters
export const filterMessagesAlt = async (
  conversationId: string | number,
  parentId?: string | number,
  searchTerm?: string
): Promise<FilterMessagesResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.FILTER(
    conversationId,
    parentId,
    searchTerm
  );
  
  const res = await getRequest<FilterMessagesResponse>(url);
  return res;
};
export interface ReplyToMessagePayload {
  conversationId: number;
  content: string;
  mentions?: string[];
  fileInfo?: MessageFileInfo[]; // ✅ new field for attachments
}

export interface ReplyToMessageResponse {
  isSuccess: boolean;
  message: string;
  data: Message; // The reply message object
}

// Service function for replying to a message
export const replyToMessage = async (
  messageId: string | number,
  payload: ReplyToMessagePayload
): Promise<ReplyToMessageResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.REPLY(messageId);
  const res = await postRequest<ReplyToMessageResponse>(url, payload);
  return res;
};
export interface EditMessagePayload {
  content: string;
  mentions?: string[];
  // Other editable fields as needed by your API
}

export interface EditMessageResponse {
  isSuccess: boolean;
  message: string;
  data: Message; // The updated message object
}

// Service function for editing a message
export const editMessage = async (
  messageId: string | number,
  payload: EditMessagePayload
): Promise<EditMessageResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.EDIT(messageId);
  const res = await putRequest<EditMessageResponse>(url, payload);
  return res;
};
export interface GetMessageResponse {
  isSuccess: boolean;
  message: string;
  data: Message; // Single message object
}

// Service function for getting a single message
export const getMessage = async (
  messageId: string | number
): Promise<GetMessageResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.GET(messageId);
  const res = await getRequest<GetMessageResponse>(url);
  return res;
};
export interface DeleteMessageResponse {
  isSuccess: boolean;
  message: string;
  data?: any;
}

// Service function for deleting a message
export const deleteMessage = async (
  messageId: string | number
): Promise<DeleteMessageResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.DELETE(messageId);
  const res = await deleteRequest<DeleteMessageResponse>(url);
  return res;
};
export interface AddReactionPayload {
  reaction: string; // Emoji string like "😒", "👍", "❤️", etc.
}

export interface AddReactionResponse {
  isSuccess: boolean;
  message: string;
  data?: any; // Could contain updated reaction list or message object
}

// Service function for adding a reaction
export const addReaction = async (
  messageId: string | number,
  payload: AddReactionPayload
): Promise<AddReactionResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.REACT(messageId);
  const res = await postRequest<AddReactionResponse>(url, payload);
  return res;
};
export interface RemoveReactionResponse {
  isSuccess: boolean;
  message: string;
  data?: any; // Could contain updated reaction list or message object
}

// Service function for removing a reaction
export const removeReaction = async (
  messageId: string | number
): Promise<RemoveReactionResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.REMOVE_REACTION(messageId);
  const res = await deleteRequest<RemoveReactionResponse>(url);
  return res;
};

// Alternative: If you need to specify which reaction to remove
export interface RemoveSpecificReactionPayload {
  reaction?: string; // Optional: specific emoji to remove
}

export const removeSpecificReaction = async (
  messageId: string | number,
  payload?: RemoveSpecificReactionPayload
): Promise<RemoveReactionResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.REMOVE_REACTION(messageId);
  const res = await deleteRequest<RemoveReactionResponse>(url, payload);
  return res;
};
export interface MessageReceipt {
    messageId:      number;

  userId: string;
  userName: string;
 status: string;
 updatedAt: string;
 
  // Add other receipt properties as needed
}

export interface MessageReceiptsResponse {
  isSuccess: boolean;
  message: string;
  data: MessageReceipt[]; // Array of receipt objects
}

// Service function for getting message read receipts
export const getMessageReceipts = async (
  messageId: string | number
): Promise<MessageReceiptsResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.RECEIPTS(messageId);
  const res = await getRequest<MessageReceiptsResponse>(url);
  return res;
};
export interface UpdateReceiptPayload {
  messageIds: number[]; // Array of message IDs
  status: "SENT" | "DELIVERED" | "READ"; // Receipt status
}

export interface UpdateReceiptResponse {
  isSuccess: boolean;
  message: string;
  data?: any;
}

// Service function for updating message receipts
export const updateMessageReceipt = async (
  payload: UpdateReceiptPayload
): Promise<UpdateReceiptResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.UPDATE_RECEIPT;
  const res = await putRequest<UpdateReceiptResponse>(url, payload);
  return res;
};

// ---- Interfaces ----
export interface UploadMessageFile {
  fileName: string;
  fileType: string;
  identifier: string;
}

export interface UploadMessageUrlsPayload {
  conversationId: number;
  files: UploadMessageFile[];
}

export interface UploadMessageUrlsResponse {
  isSuccess: boolean;
  message: string;
  data: {
    docId: string | null;
    type: string;
    fileName: string;
    fileType: string;
    url: string;
    key: string;
    identifier: string;
  }[];
}


// Utility function to append timestamp
const withTimestamp = (fileName: string): string => {
  const timestamp = Date.now();
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) {
    // no extension
    return `${fileName}_${timestamp}`;
  }
  const name = fileName.substring(0, dotIndex);
  const ext = fileName.substring(dotIndex); // includes the dot
  return `${name}_${timestamp}${ext}`;
};

// ---- Service function ----
export const uploadMessageUrls = async (
  payload: UploadMessageUrlsPayload
): Promise<UploadMessageUrlsResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.UPLOAD_URLS;

  // transform filenames before sending to API
  const transformedPayload: UploadMessageUrlsPayload = {
    ...payload,
    files: payload.files.map((f) => ({
      ...f,
      fileName: withTimestamp(f.fileName),
    })),
  };

  const res = await postRequest<UploadMessageUrlsResponse>(
    url,
    transformedPayload
  );
  return res;
};
// ---- Interfaces ----
export interface DownloadFile {
  fileName: string;
  downloadUrl: string;
  identifier: string;
  fileType?: string;
}

export interface DownloadFilesResponse {
  isSuccess: boolean;
  message: string;
  data: DownloadFile[];
}

// ---- Service function ----
export const getDownloadFiles = async (
  messageId: string | number
): Promise<DownloadFilesResponse> => {
  const url = API_CONSTANTS.CHAT_MODULE.MESSAGE.DOWNLOAD_FILES(messageId);
  const res = await getRequest<DownloadFilesResponse>(url);
  return res;
};

