/**
 * GET  /api/conversations — List user's conversations
 * POST /api/conversations — Create a new conversation
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import {
  listConversations,
  createConversation,
  getActiveConversation,
  getMessages,
} from "@/lib/conversations/db";

export const GET = safeHandler(async function GET(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const activeOnly = req.nextUrl.searchParams.get("active") === "true";

  if (activeOnly) {
    const conversation = await getActiveConversation(auth.user.id);
    if (!conversation) {
      return Response.json({ conversation: null, messages: [] });
    }
    const messages = await getMessages(auth.user.id, conversation.id);
    return Response.json({ conversation, messages });
  }

  const conversations = await listConversations(auth.user.id);
  return Response.json({ conversations });
});

export const POST = safeHandler(async function POST(req: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  let title = "New conversation";
  try {
    const body = await req.json();
    if (typeof body.title === "string" && body.title.trim()) {
      title = body.title.trim();
    }
  } catch {
    // default title
  }

  const conversation = await createConversation(auth.user.id, title);
  if (!conversation) return apiError("Failed to create conversation");

  return Response.json({ conversation }, { status: 201 });
});
