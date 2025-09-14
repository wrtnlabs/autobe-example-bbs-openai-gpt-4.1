import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAppeal";
import { IPageIDiscussBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardAppeal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve paginated list of all appeals submitted against moderation actions
 * (administrator only).
 *
 * This endpoint allows administrators to fetch a paginated and filterable list
 * of appeals submitted by members regarding moderation actions. Supports
 * filtering by status, appellant, moderation action, creation timestamp, and
 * sorting.
 *
 * @param props - Request properties
 * @param props.administrator - The authenticated administrator
 * @param props.body - Filter, search, and pagination criteria
 * @returns Paginated, summarized list of appeals
 * @throws {Error} When access is denied or other errors occur
 */
export async function patch__discussBoard_administrator_appeals(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardAppeal.IRequest;
}): Promise<IPageIDiscussBoardAppeal.ISummary> {
  const { body } = props;
  const page =
    body.page && Number.isFinite(body.page) && body.page > 0
      ? Number(body.page)
      : 1;
  const limit =
    body.limit && Number.isFinite(body.limit) && body.limit > 0
      ? Number(body.limit)
      : 20;
  const skip = (page - 1) * limit;

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

  // Only allow ordering by whitelisted fields
  const allowedSortFields = ["created_at", "status"];
  let orderBy: Record<string, "asc" | "desc">;
  if (
    typeof body.sort === "string" &&
    allowedSortFields.some((f) => body.sort && body.sort.startsWith(f))
  ) {
    if (body.sort.endsWith("_asc")) {
      orderBy = { [body.sort.replace("_asc", "")]: "asc" };
    } else if (body.sort.endsWith("_desc")) {
      orderBy = { [body.sort.replace("_desc", "")]: "desc" };
    } else {
      orderBy = { created_at: "desc" };
    }
  } else {
    orderBy = { created_at: "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_appeals.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_appeals.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    moderation_action_id: row.moderation_action_id,
    appellant_member_id: row.appellant_member_id,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
