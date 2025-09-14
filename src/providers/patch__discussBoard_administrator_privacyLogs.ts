import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPrivacyLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPrivacyLogs";
import { IPageIDiscussBoardPrivacyLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardPrivacyLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a paginated and filterable set of privacy action logs.
 *
 * This endpoint allows administrators to query audit logs documenting
 * privacy-relevant actions on user data across the platform (such as export,
 * deletion, consent changes, or policy modifications) from the
 * discuss_board_privacy_logs table. Filtering options include actor/subject
 * IDs, action type, result status, timestamp ranges, and free-text search in
 * the description. This data supports audit and compliance checks.
 *
 * Only authenticated administrators may access this endpoint.
 *
 * @param props - Request parameters
 * @param props.administrator - The authenticated administrator payload
 * @param props.body - Filters and pagination data for the query
 *   (IDiscussBoardPrivacyLogs.IRequest)
 * @returns Paginated list of privacy logs matching filters
 * @throws {Error} If Prisma query fails or filter parameters are invalid
 */
export async function patch__discussBoard_administrator_privacyLogs(props: {
  administrator: AdministratorPayload;
  body: IDiscussBoardPrivacyLogs.IRequest;
}): Promise<IPageIDiscussBoardPrivacyLogs> {
  const { body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(body.actor_user_account_id !== undefined &&
      body.actor_user_account_id !== null && {
        actor_user_account_id: body.actor_user_account_id,
      }),
    ...(body.data_subject_user_account_id !== undefined &&
      body.data_subject_user_account_id !== null && {
        data_subject_user_account_id: body.data_subject_user_account_id,
      }),
    ...(body.action_type !== undefined &&
      body.action_type !== null && {
        action_type: body.action_type,
      }),
    ...(body.result_status !== undefined &&
      body.result_status !== null && {
        result_status: body.result_status,
      }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {}),
    ...(body.search !== undefined &&
      body.search !== null && {
        description: { contains: body.search },
      }),
  };

  const orderBy = {
    [body.orderBy ?? "created_at"]:
      body.sortDirection === "asc" ? "asc" : "desc",
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discuss_board_privacy_logs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discuss_board_privacy_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((log) => ({
      id: log.id,
      actor_user_account_id: log.actor_user_account_id ?? undefined,
      data_subject_user_account_id:
        log.data_subject_user_account_id ?? undefined,
      action_type: log.action_type,
      description: log.description ?? undefined,
      result_status: log.result_status,
      created_at: toISOStringSafe(log.created_at),
    })),
  };
}
