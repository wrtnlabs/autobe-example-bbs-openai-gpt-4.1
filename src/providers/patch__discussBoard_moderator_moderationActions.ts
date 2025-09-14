import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationAction";
import { IPageIDiscussBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardModerationAction";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

/**
 * Retrieve a paginated, filterable list of moderation actions (moderator/admin
 * only) from discuss_board_moderation_actions.
 *
 * This operation enables privileged moderators to search and audit all
 * moderation interventions in the system, supporting advanced filtering by
 * actor, affected user, content, status, and flexible pagination/sorting.
 * Soft-deleted actions are excluded. Results are limited to summary fields for
 * efficient dashboard display and analytics.
 *
 * @param props - Properties for this operation.
 * @param props.moderator - The authenticated moderator performing this request.
 * @param props.body - Search, filter, and pagination criteria to apply to the
 *   moderation action query.
 * @returns Paginated list of moderation action summaries matching the given
 *   criteria.
 * @throws {Error} If database access fails or invalid search parameters are
 *   specified.
 */
export async function patch__discussBoard_moderator_moderationActions(props: {
  moderator: ModeratorPayload;
  body: IDiscussBoardModerationAction.IRequest;
}): Promise<IPageIDiscussBoardModerationAction.ISummary> {
  const { body } = props;

  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;

  // Inline Prisma where clause with all necessary filters and soft delete logic
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_moderation_actions.findMany({
      where: {
        deleted_at: null,
        ...(body.moderator_id !== undefined &&
          body.moderator_id !== null && { moderator_id: body.moderator_id }),
        ...(body.target_member_id !== undefined &&
          body.target_member_id !== null && {
            target_member_id: body.target_member_id,
          }),
        ...(body.target_post_id !== undefined &&
          body.target_post_id !== null && {
            target_post_id: body.target_post_id,
          }),
        ...(body.target_comment_id !== undefined &&
          body.target_comment_id !== null && {
            target_comment_id: body.target_comment_id,
          }),
        ...(body.action_type !== undefined &&
          body.action_type !== null && { action_type: body.action_type }),
        ...(body.status !== undefined &&
          body.status !== null && { status: body.status }),
        ...((body.created_at_from !== undefined &&
          body.created_at_from !== null) ||
        (body.created_at_to !== undefined && body.created_at_to !== null)
          ? {
              created_at: {
                ...(body.created_at_from !== undefined &&
                  body.created_at_from !== null && {
                    gte: body.created_at_from,
                  }),
                ...(body.created_at_to !== undefined &&
                  body.created_at_to !== null && { lte: body.created_at_to }),
              },
            }
          : {}),
      },
      orderBy: (() => {
        if (body.sort && typeof body.sort === "string") {
          const [fieldRaw, dirRaw] = body.sort.split(":");
          const field =
            fieldRaw === "created_at" ||
            fieldRaw === "updated_at" ||
            fieldRaw === "action_type" ||
            fieldRaw === "status"
              ? fieldRaw
              : "created_at";
          const dir = dirRaw === "asc" ? "asc" : "desc";
          return { [field]: dir };
        }
        return { created_at: "desc" };
      })(),
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        moderator_id: true,
        target_member_id: true,
        target_post_id: true,
        target_comment_id: true,
        action_type: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discuss_board_moderation_actions.count({
      where: {
        deleted_at: null,
        ...(body.moderator_id !== undefined &&
          body.moderator_id !== null && { moderator_id: body.moderator_id }),
        ...(body.target_member_id !== undefined &&
          body.target_member_id !== null && {
            target_member_id: body.target_member_id,
          }),
        ...(body.target_post_id !== undefined &&
          body.target_post_id !== null && {
            target_post_id: body.target_post_id,
          }),
        ...(body.target_comment_id !== undefined &&
          body.target_comment_id !== null && {
            target_comment_id: body.target_comment_id,
          }),
        ...(body.action_type !== undefined &&
          body.action_type !== null && { action_type: body.action_type }),
        ...(body.status !== undefined &&
          body.status !== null && { status: body.status }),
        ...((body.created_at_from !== undefined &&
          body.created_at_from !== null) ||
        (body.created_at_to !== undefined && body.created_at_to !== null)
          ? {
              created_at: {
                ...(body.created_at_from !== undefined &&
                  body.created_at_from !== null && {
                    gte: body.created_at_from,
                  }),
                ...(body.created_at_to !== undefined &&
                  body.created_at_to !== null && { lte: body.created_at_to }),
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 1,
    },
    data: rows.map((row) => ({
      id: row.id,
      moderator_id: row.moderator_id,
      target_member_id: row.target_member_id ?? null,
      target_post_id: row.target_post_id ?? null,
      target_comment_id: row.target_comment_id ?? null,
      action_type: row.action_type,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
