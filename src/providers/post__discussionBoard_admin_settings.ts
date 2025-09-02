import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new system/business setting (discussion_board_settings table).
 *
 * This API endpoint allows platform admins to register new configuration
 * settings (e.g., feature flags, operational limits, system parameters) into
 * the board configuration. Uniqueness is enforced for the key field, and the
 * API returns full metadata for audit. Business logic may validate the key and
 * value pattern, with errors returned for collisions or invalid settings. This
 * enables fast, code-free reconfiguration of board/platform features as
 * business requirements evolve. Related endpoints support update or delete.
 * Audit logs are recorded automatically.
 *
 * @param props - Object containing admin authentication and the new setting's
 *   data.
 * @param props.admin - The authenticated admin user making this request.
 * @param props.body - The IDiscussionBoardSetting.ICreate input for the setting
 *   fields.
 * @returns IDiscussionBoardSetting object representing the new setting as saved
 *   in the database.
 * @throws {Error} If an entry with the same key already exists (unique
 *   constraint violation), or on other database errors.
 */
export async function post__discussionBoard_admin_settings(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSetting.ICreate;
}): Promise<IDiscussionBoardSetting> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.discussion_board_settings.create({
      data: {
        id: v4() /* string & tags.Format<'uuid'> */,
        key: props.body.key,
        value: props.body.value,
        description: props.body.description ?? null,
        is_system: props.body.is_system,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      } satisfies IDiscussionBoardSetting, // Ensure structure at compile time
    });
    return {
      id: created.id,
      key: created.key,
      value: created.value,
      description: created.description,
      is_system: created.is_system,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(`A setting with the same key already exists.`);
    }
    throw error;
  }
}
