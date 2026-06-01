/**
 * POST /api/conversations/[id]/messages — Persist a message
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { insertMessage, getConversation, deriveTitle, updateConversation } from "@/lib/conversations/db";

export const POST = safeHandler(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id: conversationId } = await params;

  const conversation = await getConversation(auth.user.id, conversationId);
  if (!conversation) return apiError("Conversation not found", 404);

  let body: { role?: string; content?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid body", 400);
  }

  if (body.role !== "user" && body.role !== "assistant") {
    return apiError("role must be user or assistant", 400);
  }
  if (typeof body.content !== "string") {
    return apiError("content is required", 400);
  }

  const message = await insertMessage(auth.user.id, conversationId, {
    role:    body.role,
    content: body.content,
    status:  (body.status as "sent" | "streaming" | "error") ?? "sent",
  });

  if (!message) return apiError("Failed to save message");

  if (
    body.role === "user" &&
    conversation.title === "New conversation"
  ) {
    await updateConversation(auth.user.id, conversationId, {
      title: deriveTitle(body.content),
    });
  }

  return Response.json({ message }, { status: 201 });
});
