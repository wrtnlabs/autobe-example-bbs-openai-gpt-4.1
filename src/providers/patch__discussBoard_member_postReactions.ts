import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostReaction";
import { IPageIDiscussBoardPostReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardPostReaction";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * List and filter post reactions (discuss_board_post_reactions) with
 * pagination.
 *
 * Retrieves a paginated, filtered list of post reaction summary records for
 * analytics, moderation, or member auditing. Filtering options include member,
 * post, reaction type, and time ranges for created_at/updated_at, with support
 * for soft-delete exclusion and sorting.
 *
 * @param props - Request properties
 * @param props.member - The authenticated member making the request
 *   (authorization required)
 * @param props.body - Filter and pagination criteria
 * @returns A paginated list of post reaction summary records, matching filter
 *   criteria
 * @throws {Error} For improper pagination or internal query failures
 */
export async function patch__discussBoard_member_postReactions(props: {
  member: MemberPayload;
  body: IDiscussBoardPostReaction.IRequest;
}): Promise<IPageIDiscussBoardPostReaction.ISummary> {
  const { member, body } = props;
  // Default pagination: page >= 1, limit min 1 max 100
  const pageRaw = body.page;
  const limitRaw = body.limit;
  const page = typeof pageRaw === "number" && pageRaw > 0 ? Number(pageRaw) : 1;
  const limit =
    typeof limitRaw === "number" && limitRaw > 0 && limitRaw <= 100
      ? Number(limitRaw)
      : 20;

  // Build where object, treating date ranges as objects for correct Prisma filtering
  const createdAtFilter =
    body.created_at_from != null || body.created_at_to != null
      ? {
          ...(body.created_at_from != null && { gte: body.created_at_from }),
          ...(body.created_at_to != null && { lte: body.created_at_to }),
        }
      : undefined;
  const updatedAtFilter =
    body.updated_at_from != null || body.updated_at_to != null
      ? {
          ...(body.updated_at_from != null && { gte: body.updated_at_from }),
          ...(body.updated_at_to != null && { lte: body.updated_at_to }),
        }
      : undefined;

  // Only allow filtering on fields that exist in the schema
  // Always filter out soft-deleted reactions
  const where = {
    deleted_at: null,
    ...(body.discuss_board_member_id != null && {
      discuss_board_member_id: body.discuss_board_member_id,
    }),
    ...(body.discuss_board_post_id != null && {
      discuss_board_post_id: body.discuss_board_post_id,
    }),
    ...(body.reaction_type != null && { reaction_type: body.reaction_type }),
    ...(createdAtFilter && { created_at: createdAtFilter }),
    ...(updatedAtFilter && { updated_at: updatedAtFilter }),
  };

  // Query results and count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_post_reactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_post_reactions.count({ where }),
  ]);

  // Map each row to ISummary structure, converting date fields with toISOStringSafe
  const data = rows.map((row) => ({
    id: row.id,
    discuss_board_member_id: row.discuss_board_member_id,
    discuss_board_post_id: row.discuss_board_post_id,
    reaction_type: row.reaction_type,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
