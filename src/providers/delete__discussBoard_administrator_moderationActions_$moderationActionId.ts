import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Permanently delete a moderation action record by its unique identifier.
 *
 * This operation performs a hard delete of a moderation action entity from the
 * database using its moderationActionId. Only an authenticated administrator
 * may invoke this operation. It may be executed in exceptional compliance or
 * legal scenarios such as GDPR erasure requests or after required audit
 * retention periods are met. No business-level soft delete is defined, so this
 * operation will remove the record permanently. If the moderation action does
 * not exist, a 404 error is thrown. If invoked by a user lacking administrator
 * privileges, a 403 error is triggered (handled at the controller/authorization
 * layer).
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.administrator - The authenticated administrator performing this
 *   operation (role enforced by controller)
 * @param props.moderationActionId - The unique identifier of the moderation
 *   action to delete
 * @returns Void
 * @throws {Error} If the moderation action does not exist (404 Not Found)
 * @throws {Error} If invoked by a non-administrator (403 Forbidden, handled by
 *   controller binding)
 */
export async function delete__discussBoard_administrator_moderationActions_$moderationActionId(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { moderationActionId } = props;
  // Ensure the moderation action exists (Prisma will throw if not found, controller maps to 404)
  await MyGlobal.prisma.discuss_board_moderation_actions.findUniqueOrThrow({
    where: { id: moderationActionId },
  });
  // Hard delete the moderation action
  await MyGlobal.prisma.discuss_board_moderation_actions.delete({
    where: { id: moderationActionId },
  });
}
