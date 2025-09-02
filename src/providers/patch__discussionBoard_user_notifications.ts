import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";
import { IPageIDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieve a filtered, paginated list of notifications for the authenticated
 * user.
 *
 * Retrieves a paginated and filtered list of notifications for the
 * authenticated user. The operation supports searching, sorting, and filtering
 * by notification types, status (read/unread/archived), relevant dates, and
 * related posts or comments. It leverages the discussion_board_notifications
 * table, which contains all delivery instances of notifications with fields
 * such as recipient_user_id, type, status, and timestamps for creation,
 * delivery, and reading. Complex queries allow users to manage large volumes of
 * notifications efficiently while respecting in-app, email, or push channels as
 * defined by notification preference settings.
 *
 * Access control is enforced such that users can only access notifications sent
 * to themselves, with appropriate role and ownership checking. Notification
 * content (title, body, and action_url) is included based on preference and
 * status. Security considerations ensure that notification visibility complies
 * with privacy, moderation, and system alert policies.
 *
 * Related notification operations include marking as read (PUT), deleting
 * (DELETE), and retrieving individual notification (GET by ID). Failure
 * scenarios such as invalid pagination options, inaccessible notifications, or
 * attempts to access others' notifications return precise business errors in
 * accordance with audit policy.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user making the request
 * @param props.body - Filter, search, and pagination criteria for retrieving
 *   notifications
 * @returns Paginated list of notifications matching the filters, sorted
 *   according to user request
 * @throws {Error} When the user is unauthorized or the input is invalid
 */
export async function patch__discussionBoard_user_notifications(props: {
  user: UserPayload;
  body: IDiscussionBoardNotification.IRequest;
}): Promise<IPageIDiscussionBoardNotification> {
  const { user, body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where condition inline for Prisma type inference
  const where = {
    recipient_user_id: user.id,
    deleted_at: null,
    ...(body.type && { type: body.type }),
    ...(body.status && { status: body.status }),
    ...(body.post_id && { post_id: body.post_id }),
    ...(body.comment_id && { comment_id: body.comment_id }),
    ...((body.from_date || body.to_date) && {
      created_at: {
        ...(body.from_date && { gte: body.from_date }),
        ...(body.to_date && { lte: body.to_date }),
      },
    }),
    ...(body.q && {
      OR: [
        { title: { contains: body.q, mode: "insensitive" as const } },
        { body: { contains: body.q, mode: "insensitive" as const } },
      ],
    }),
  };

  // Handle sorting
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort === "created_at") {
    orderBy = { created_at: "asc" };
  } else if (body.sort === "-created_at") {
    orderBy = { created_at: "desc" };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_notifications.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_notifications.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: rows.map((n) => ({
      id: n.id,
      recipient_user_id: n.recipient_user_id,
      actor_user_id: n.actor_user_id ?? null,
      post_id: n.post_id ?? null,
      comment_id: n.comment_id ?? null,
      type: n.type,
      status: n.status,
      title: n.title ?? null,
      body: n.body ?? null,
      action_url: n.action_url ?? null,
      failure_reason: n.failure_reason ?? null,
      created_at: toISOStringSafe(n.created_at),
      delivered_at: n.delivered_at ? toISOStringSafe(n.delivered_at) : null,
      read_at: n.read_at ? toISOStringSafe(n.read_at) : null,
      deleted_at: n.deleted_at ? toISOStringSafe(n.deleted_at) : null,
    })),
  };
}
