import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationPreference";
import { IPageIDiscussionBoardNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotificationPreference";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * List and filter notification preferences for the authenticated user.
 *
 * Retrieves a filtered, paginated list of notification preferences for the
 * authenticated user. Each record specifies delivery channel options (in-app,
 * email, push), frequency (immediate, digest), muted intervals, and categories.
 * This operation queries the discussion_board_notification_preferences table,
 * where each record is linked to a user and can cover multiple notification
 * types. Used to display, manage, or export notification preferences per user.
 *
 * Access is always limited to the requesting user's own preferences; security
 * checks prevent access to other users' preferences. This operation is
 * typically used for displaying in profile, account, or notification settings
 * screens.
 *
 * Potential error cases include searching for preferences before any are
 * defined, attempting to access another user's preferences, or providing
 * invalid pagination/filter parameters.
 *
 * @param props - Object containing the authenticated user and filter/pagination
 *   body
 * @param props.user - The authenticated user making the request
 * @param props.body - Filtering, search, and pagination options (optional
 *   fields)
 * @returns Paginated and filtered notification preferences for the current user
 * @throws {Error} If sort field is invalid or other query construction error
 */
export async function patch__discussionBoard_user_notificationPreferences(props: {
  user: UserPayload;
  body: IDiscussionBoardNotificationPreference.IRequest;
}): Promise<IPageIDiscussionBoardNotificationPreference> {
  const { user, body } = props;
  const {
    email_enabled,
    push_enabled,
    in_app_enabled,
    frequency,
    categories,
    page,
    limit,
    sort,
    q,
  } = body;

  // Define allowed sort fields for security
  const SORT_FIELDS = [
    "id",
    "categories",
    "frequency",
    "mute_until",
    "created_at",
    "updated_at",
  ];
  const DEFAULT_SORT = { created_at: "desc" as const };
  let orderBy: Record<string, "asc" | "desc"> = DEFAULT_SORT;
  if (sort && typeof sort === "string") {
    let field = sort;
    let order: "asc" | "desc" = "asc";
    if (sort.startsWith("-")) {
      field = sort.slice(1);
      order = "desc";
    }
    if (SORT_FIELDS.includes(field)) {
      orderBy = { [field]: order };
    }
  }

  // Safe pagination defaults
  const pageNum = typeof page === "number" && page > 0 ? page : 1;
  const pageSize = typeof limit === "number" && limit > 0 ? limit : 20;
  const skip = (pageNum - 1) * pageSize;
  const take = pageSize;

  // WHERE conditions: always constrain to the current user
  const where = {
    user_id: user.id,
    ...(email_enabled !== undefined ? { email_enabled } : {}),
    ...(push_enabled !== undefined ? { push_enabled } : {}),
    ...(in_app_enabled !== undefined ? { in_app_enabled } : {}),
    ...(frequency !== undefined ? { frequency } : {}),
    ...(categories !== undefined ? { categories } : {}),
    ...(q
      ? {
          OR: [{ categories: { contains: q, mode: "insensitive" as const } }],
        }
      : {}),
  };

  // Retrieve rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_notification_preferences.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_notification_preferences.count({ where }),
  ]);

  return {
    pagination: {
      current: pageNum,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      email_enabled: row.email_enabled,
      push_enabled: row.push_enabled,
      in_app_enabled: row.in_app_enabled,
      frequency: row.frequency,
      categories: row.categories,
      mute_until:
        row.mute_until === null || row.mute_until === undefined
          ? null
          : toISOStringSafe(row.mute_until),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
