import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeal";
import { IPageIDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardAppeal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patch__discussBoard_moderator_appeals(props: {
  moderator: ModeratorPayload;
  body: IDiscussBoardAppeal.IRequest;
}): Promise<IPageIDiscussBoardAppeal.ISummary> {
  const { body } = props;
  const page = body.page ?? (1 as number);
  const limit = body.limit ?? (20 as number);
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    deleted_at: null,
    ...(body.moderation_action_id !== undefined &&
      body.moderation_action_id !== null && {
        moderation_action_id: body.moderation_action_id,
      }),
    ...(body.appellant_member_id !== undefined &&
      body.appellant_member_id !== null && {
        appellant_member_id: body.appellant_member_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Only support sort by status or created_at desc/asc
  let orderField: "created_at" | "status" = "created_at";
  let orderDirection: "asc" | "desc" = "desc";
  if (body.sort && body.sort.endsWith("_asc")) orderDirection = "asc";
  if (body.sort && body.sort.startsWith("status")) orderField = "status";

  // Must inline, and use computed property with literal direction
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_appeals.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: Number(limit),
      select: {
        id: true,
        moderation_action_id: true,
        appellant_member_id: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.discuss_board_appeals.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((r) => ({
      id: r.id,
      moderation_action_id: r.moderation_action_id,
      appellant_member_id: r.appellant_member_id,
      status: r.status,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
