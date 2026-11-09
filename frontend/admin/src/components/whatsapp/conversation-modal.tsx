"use client";

import { ConversationThread } from "@/components/whatsapp/conversation-thread";
import { modal } from "@/lib/modal";

/**
 * Opens a conversation's full history + composer as a popup - used from
 * places that aren't the inbox (a lead's detail popup, the notification bell).
 * The thread needs a bounded height to scroll its own message list.
 */
export function openConversationModal(conversationId: number): void {
  modal.custom({
    content: (
      <div className="-m-2 h-[70vh] min-h-[26rem] w-full overflow-hidden rounded-md sm:min-w-[32rem]">
        <ConversationThread conversationId={conversationId} />
      </div>
    ),
  });
}
