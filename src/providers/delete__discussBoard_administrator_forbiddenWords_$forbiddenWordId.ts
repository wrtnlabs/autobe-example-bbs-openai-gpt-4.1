import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Soft delete a forbidden word rule (discuss_board_forbidden_words table).
 *
 * Removes a forbidden word, phrase, or regex from active enforcement by marking
 * its 'deleted_at' timestamp. The record is preserved for audit, compliance,
 * and potential rollback but is no longer used for moderation filtering. Only
 * administrators can perform this operation.
 *
 * Authorization: Only administrators (validated via AdministratorPayload) may
 * delete forbidden word rules. Deletion is strictly a soft-delete (sets
 * 'deleted_at'), not physical removal. Attempts to delete non-existent or
 * already-deleted rules result in error.
 *
 * @param props - Properties for the operation
 * @param props.administrator - Authenticated administrator performing the
 *   deletion
 * @param props.forbiddenWordId - UUID of the forbidden word rule to soft-delete
 * @returns Void
 * @throws {Error} If the forbidden word does not exist or has already been
 *   deleted
 */
export async function delete__discussBoard_administrator_forbiddenWords_$forbiddenWordId(props: {
  administrator: AdministratorPayload;
  forbiddenWordId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, forbiddenWordId } = props;

  // Attempt to find the forbidden word rule that is not already soft-deleted
  const forbiddenWord =
    await MyGlobal.prisma.discuss_board_forbidden_words.findFirst({
      where: {
        id: forbiddenWordId,
        deleted_at: null,
      },
    });

  if (!forbiddenWord) {
    throw new Error("Forbidden word not found or already deleted.");
  }

  // Update the forbidden word rule to set the deleted_at field (soft delete)
  await MyGlobal.prisma.discuss_board_forbidden_words.update({
    where: { id: forbiddenWordId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
