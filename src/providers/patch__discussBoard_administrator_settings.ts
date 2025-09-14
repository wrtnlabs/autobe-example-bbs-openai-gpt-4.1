import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardSettings";
import { IPageIDiscussBoardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardSettings";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patch__discussBoard_administrator_settings(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardSettings.IRequest;
}): Promise<IPageIDiscussBoardSettings> {
  const { body } = props;
  // Pagination: page 1-based, limit default 20, min 1
  const page = body.page && body.page > 0 ? Number(body.page) : 1;
  const limit = body.limit && body.limit > 0 ? Number(body.limit) : 20;

  // Filtering
  // We must first build created_at condition because it may combine gte/lte
  let createdAtCond: { gte?: string; lte?: string } | undefined = undefined;
  if (body.created_after !== undefined && body.created_after !== null) {
    createdAtCond = { ...(createdAtCond ?? {}), gte: body.created_after };
  }
  if (body.created_before !== undefined && body.created_before !== null) {
    createdAtCond = { ...(createdAtCond ?? {}), lte: body.created_before };
  }

  // Now build where condition safely
  const where = {
    ...(createdAtCond && { created_at: createdAtCond }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.trim().length > 0 && {
        config_json: {
          contains: body.search,
        },
      }),
  };

  // Only allow sorting by these fields
  const allowedOrderBy = ["id", "config_json", "created_at", "updated_at"];
  const orderKey =
    body.orderBy && allowedOrderBy.includes(body.orderBy)
      ? body.orderBy
      : "created_at";
  const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";

  // Prisma query for data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_settings.findMany({
      where,
      orderBy: { [orderKey]: sortDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_settings.count({ where }),
  ]);

  // Transform data to API contract types, converting dates using toISOStringSafe
  const data = rows.map((item) => ({
    id: item.id,
    config_json: item.config_json,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  // Pagination meta
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
