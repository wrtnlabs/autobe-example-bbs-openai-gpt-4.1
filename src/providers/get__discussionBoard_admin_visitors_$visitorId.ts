import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve visitor account details by visitorId (discussion_board_visitors).
 *
 * Retrieves the non-PII details of a visitor account by visitorId for platform
 * admin audit, compliance, or operational review purposes. Only accessible by
 * authenticated platform admins, and only returns records not soft-deleted
 * (deleted_at is null).
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making this request
 * @param props.visitorId - Unique identifier (UUID) of the visitor account to
 *   fetch
 * @returns Full non-PII details of the referenced visitor account
 *   (IDiscussionBoardVisitor)
 * @throws {Error} If the visitor account does not exist or has been
 *   soft-deleted
 */
export async function get__discussionBoard_admin_visitors_$visitorId(props: {
  admin: AdminPayload;
  visitorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardVisitor> {
  const record = await MyGlobal.prisma.discussion_board_visitors.findFirst({
    where: { id: props.visitorId, deleted_at: null },
  });
  if (!record) throw new Error("Visitor account not found");
  return {
    id: record.id,
    visitor_token: record.visitor_token,
    ip_address: record.ip_address ?? null,
    user_agent: record.user_agent ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
