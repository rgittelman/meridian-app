/**
 * GET    /api/conversations/[id] — Get conversation + messages
 * PATCH  /api/conversations/[id] — Update title or set active
 * DELETE /api/conversations/[id] — Soft-delete conversation
 */

import { NextRequest } from "next/server";
import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import {
  getConversationWithMessages,
  updateConversation,
  softDeleteConversation,
  setActiveConversation,
} from "@/lib/conversations/db";

export const GET = safeHandler(async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const result = await getConversationWithMessages(auth.user.id, id);
  if (!result) return apiError("Conversation not found", 404);

  return Response.json(result);
});

export const PATCH = safeHandler(async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  let body: { title?: string; set_active?: boolean };

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid body", 400);
  }

  if (body.set_active) {
    await setActiveConversation(auth.user.id, id);
  }

  if (body.title) {
    await updateConversation(auth.user.id, id, { title: body.title });
  }

  return Response.json({ ok: true });
});

export const DELETE = safeHandler(async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const ok = await softDeleteConversation(auth.user.id, id);
  if (!ok) return apiError("Failed to delete", 500);

  return Response.json({ deleted: true });
});
