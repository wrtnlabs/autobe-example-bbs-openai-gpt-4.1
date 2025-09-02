import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Assign or update admin privileges for a user (discussion_board_admins).
 *
 * Grant administrator privileges to a user by creating or updating an admin
 * record tied to the provided userId. This operation is restricted to existing
 * administrators.
 *
 * Privileges include the highest-level access on the platform, with assignment
 * and revocation recorded for auditing. Each assignment should be unique and
 * not overlap with suspended or revoked records. This endpoint follows
 * regulatory role management rules and is fully auditable.
 *
 * All admin assignments are managed via this single admin table. The endpoint
 * validates user status, ensures idempotency, and triggers notifications if
 * business logic so requires.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing this action
 * @param props.userId - User ID to assign admin privilege to
 * @param props.body - Admin assignment details
 * @returns The created admin assignment record for the user
 * @throws {Error} When user is already an active admin
 * @throws {Error} When user is not eligible (not verified, suspended, or
 *   deleted)
 */
export async function put__discussionBoard_admin_users_$userId_admin(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdmin.ICreate;
}): Promise<IDiscussionBoardAdmin> {
  const { admin, userId, body } = props;

  // Defensive check: enforce path param and body user_id match
  if (body.user_id !== userId) {
    throw new Error("userId in path must match user_id in body");
  }

  // 1. Check for existing active admin assignment for user
  const existing = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      user_id: userId,
      deleted_at: null,
      is_active: true,
      revoked_at: null,
    },
  });
  if (existing) {
    throw new Error("User is already an active admin");
  }

  // 2. Check user eligibility
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: userId,
      deleted_at: null,
      is_suspended: false,
    },
  });
  if (!user || user.is_verified !== true) {
    throw new Error("User is not eligible for admin privileges");
  }

  // 3. Insert admin record
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_admins.create({
    data: {
      id: v4(),
      user_id: userId,
      assigned_at: now,
      revoked_at: null,
      is_active: true,
      suspended_until: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 4. Return admin DTO with properly typed and branded values
  return {
    id: created.id,
    user_id: created.user_id,
    assigned_at: toISOStringSafe(created.assigned_at),
    revoked_at: created.revoked_at ? toISOStringSafe(created.revoked_at) : null,
    is_active: created.is_active,
    suspended_until: created.suspended_until
      ? toISOStringSafe(created.suspended_until)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
