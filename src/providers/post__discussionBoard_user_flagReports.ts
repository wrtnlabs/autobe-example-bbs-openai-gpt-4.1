import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardFlagReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFlagReport";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Flag a post or comment by creating a new user content flag report.
 *
 * Creates a new flag report in response to a user's request to flag content.
 * Records all key details including reporting user, post or comment target,
 * reason, details, and timestamps. Ensures the operation respects the unique
 * ticket constraint, sets the initial status as 'pending', and returns the new
 * flag report as per API specification.
 *
 * @param props - Request object containing UserPayload (authenticated user) and
 *   IDiscussionBoardFlagReport.ICreate (content to flag)
 * @returns The newly created flag report (IDiscussionBoardFlagReport)
 * @throws {Error} If a duplicate flag report exists for this user and content
 *   target
 * @throws {Error} For unexpected database or system errors
 */
export async function post__discussionBoard_user_flagReports(props: {
  user: UserPayload;
  body: IDiscussionBoardFlagReport.ICreate;
}): Promise<IDiscussionBoardFlagReport> {
  const { user, body } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.discussion_board_flag_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reporter_id: user.id,
        post_id: body.postId ?? null,
        comment_id: body.commentId ?? null,
        reason: body.reason,
        details: body.details ?? null,
        status: "pending",
        reviewed_at: null,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: created.id,
      reporterId: created.reporter_id,
      postId: created.post_id === null ? undefined : created.post_id,
      commentId: created.comment_id === null ? undefined : created.comment_id,
      reason: created.reason,
      details: created.details === null ? undefined : created.details,
      status: created.status,
      reviewedAt: created.reviewed_at
        ? toISOStringSafe(created.reviewed_at)
        : undefined,
      createdAt: toISOStringSafe(created.created_at),
      updatedAt: toISOStringSafe(created.updated_at),
    };
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      throw new Error(
        "Duplicate flag report: You have already flagged this content.",
      );
    }
    throw e;
  }
}
