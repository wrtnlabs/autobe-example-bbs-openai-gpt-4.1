import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationSubscription";
import { IPageIDiscussionBoardNotificationSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationSubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves a paginated and filtered list of notification subscription records
 * for the authenticated user.
 *
 * This operation operates on the discussion_board_notification_subscriptions
 * table, which stores subscriptions for in-app, push, or email notifications
 * linked to resource updates (e.g., threads, categories, posts). Filtering and
 * pagination enable users to efficiently manage and audit their active or
 * inactive notification follow states, as well as search by target
 * type/entity.
 *
 * Security checks ensure that only the requesting user's records are returned,
 * protecting privacy and complying with business rules for user-managed
 * notification subscriptions. Unauthenticated users are not permitted to access
 * this endpoint.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request
 * @param props.body - Search/filter and paging criteria for subscription query
 * @returns Paginated list of notification subscription summaries for the
 *   requesting user.
 * @throws {Error} If an error occurs during query execution or if
 *   authentication is missing
 */
export async function patch__discussionBoard_user_notificationSubscriptions(props: {
  user: UserPayload;
  body: IDiscussionBoardNotificationSubscription.IRequest;
}): Promise<IPageIDiscussionBoardNotificationSubscription.ISummary> {
  const { user, body } = props;

  // Default paging/sorting values
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  let sortField = "created_at";
  let sortOrder: "asc" | "desc" = "desc";

  if (typeof body.sort === "string" && body.sort.length > 0) {
    const normalized = body.sort.trim();
    if (normalized.startsWith("-")) {
      sortField = normalized.slice(1);
      sortOrder = "desc";
    } else {
      sortField = normalized;
      sortOrder = "asc";
    }
    // Only allow sorting by existing fields; fallback if needed
    if (!["created_at"].includes(sortField)) {
      sortField = "created_at";
      sortOrder = "desc";
    }
  }

  // Where clause inline construction
  const where = {
    user_id: user.id,
    ...(body.subscription_target_type !== undefined && {
      subscription_target_type: body.subscription_target_type,
    }),
    ...(body.keyword && {
      OR: [
        {
          subscription_target_type: {
            contains: body.keyword,
            mode: "insensitive" as const,
          },
        },
        {
          subscription_target_id: {
            contains: body.keyword,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };

  // Parallel queries: data and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_notification_subscriptions.findMany({
      where,
      orderBy: { [sortField]: sortOrder as "asc" | "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_notification_subscriptions.count({
      where,
    }),
  ]);

  // Map to API DTO structure with date branding
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      user_id: row.user_id as string & tags.Format<"uuid">,
      subscription_target_type: row.subscription_target_type,
      subscription_target_id: row.subscription_target_id as string &
        tags.Format<"uuid">,
      created_at: toISOStringSafe(row.created_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
