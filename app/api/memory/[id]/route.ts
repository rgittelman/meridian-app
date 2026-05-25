/**
 * DELETE /api/memory/[id] — Delete a single memory
 */

import { requireApiAuth, apiError } from "@/lib/api/auth";
import { safeHandler } from "@/lib/api/safe-handler";
import { deleteMemory } from "@/lib/memory/db";

export const DELETE = safeHandler(async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (!id) return apiError("Memory ID required", 400);

  const success = await deleteMemory(auth.user.id, id);
  if (!success) return apiError("Memory not found or could not be deleted", 404);

  return Response.json({ deleted: true });
});
