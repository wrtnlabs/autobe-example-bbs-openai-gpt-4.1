import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPrivacyDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPrivacyDashboard";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new privacy dashboard entry representing a user data access/export
 * request for compliance or regulatory purposes. This is typically used to
 * reflect a GDPR/CCPA user data download or privacy summary generation event.
 * The record logs all metadata needed for compliance and audit, including
 * export status and file link if available. Only compliance, admin, or
 * designated system processes should use this endpoint (props.admin enforced).
 *
 * @param props - Request properties.
 * @param props.admin - The authenticated admin making the request (injected via
 *   AdminAuth).
 * @param props.body - Payload describing the user, access request time,
 *   dashboard payload, and optional export file URI.
 * @returns The persisted privacy dashboard record with all metadata and
 *   compliance fields.
 * @throws {Error} When a dashboard record for the same user at the same request
 *   time already exists (uniqueness rule).
 */
export async function post__discussionBoard_admin_privacyDashboards(props: {
  admin: AdminPayload;
  body: IDiscussionBoardPrivacyDashboard.ICreate;
}): Promise<IDiscussionBoardPrivacyDashboard> {
  const { body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.discussion_board_privacy_dashboards.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          discussion_board_user_id: body.discussion_board_user_id,
          access_requested_at: toISOStringSafe(body.access_requested_at),
          dashboard_payload: body.dashboard_payload,
          export_file_uri: body.export_file_uri ?? null,
          access_fulfilled_at: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      discussion_board_user_id: created.discussion_board_user_id,
      access_requested_at: toISOStringSafe(created.access_requested_at),
      access_fulfilled_at: created.access_fulfilled_at
        ? toISOStringSafe(created.access_fulfilled_at)
        : null,
      dashboard_payload: created.dashboard_payload,
      export_file_uri: created.export_file_uri ?? null,
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
      // P2002: Unique constraint violation
      throw new Error(
        "A privacy dashboard record for this user and access_requested_at already exists.",
      );
    }
    throw error;
  }
}
