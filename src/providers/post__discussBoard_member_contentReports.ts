import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardContentReport";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Creates a new content report targeting a post or comment.
 *
 * This operation allows an authenticated member to submit a report on a post or
 * comment by specifying the content type, referenced content id, and a reason
 * for moderation review. The service enforces mutual exclusivity and semantic
 * correctness for target IDs, and ensures a member can only report a particular
 * post or comment once (duplicate reports are forbidden). All validation,
 * lookup, and creation steps are performed in compliance with business rules
 * and audit requirements. Report creation is written to the audit history for
 * compliance.
 *
 * @param props - API props containing the authenticated member and request body
 * @param props.member - The authenticated member submitting the report
 * @param props.body - The report creation payload (content_type, referenced id,
 *   reason)
 * @returns The newly created content report object with audit and workflow
 *   fields
 * @throws {Error} If input does not specify a single valid target, if content
 *   is missing, or if a duplicate report exists
 */
export async function post__discussBoard_member_contentReports(props: {
  member: MemberPayload;
  body: IDiscussBoardContentReport.ICreate;
}): Promise<IDiscussBoardContentReport> {
  const { member, body } = props;

  // --- Validate content target mutual exclusivity and type correctness ---
  const hasPostId =
    body.content_post_id !== null && body.content_post_id !== undefined;
  const hasCommentId =
    body.content_comment_id !== null && body.content_comment_id !== undefined;

  if ((hasPostId && hasCommentId) || (!hasPostId && !hasCommentId)) {
    throw new Error(
      "Exactly one of content_post_id or content_comment_id must be provided",
    );
  }
  if (body.content_type !== "post" && body.content_type !== "comment") {
    throw new Error("content_type must be either 'post' or 'comment'");
  }
  if (body.content_type === "post" && !hasPostId) {
    throw new Error(
      "content_post_id must be specified when content_type is 'post'",
    );
  }
  if (body.content_type === "comment" && !hasCommentId) {
    throw new Error(
      "content_comment_id must be specified when content_type is 'comment'",
    );
  }

  // --- Validate referenced content existence ---
  if (body.content_type === "post") {
    const post = await MyGlobal.prisma.discuss_board_posts.findFirst({
      where: { id: body.content_post_id! },
      select: { id: true },
    });
    if (!post) {
      throw new Error("Target post does not exist");
    }
  } else {
    const comment = await MyGlobal.prisma.discuss_board_comments.findFirst({
      where: { id: body.content_comment_id! },
      select: { id: true },
    });
    if (!comment) {
      throw new Error("Target comment does not exist");
    }
  }

  // --- Check for duplicate submission by same member for same content ---
  const existing =
    await MyGlobal.prisma.discuss_board_content_reports.findFirst({
      where: {
        reporter_member_id: member.id,
        content_post_id: hasPostId ? body.content_post_id : undefined,
        content_comment_id: hasCommentId ? body.content_comment_id : undefined,
      },
      select: { id: true },
    });
  if (existing) {
    throw new Error("You have already reported this content item");
  }

  // --- Prepare new report fields ---
  const now = toISOStringSafe(new Date());
  const reportId = v4();
  const contentType: "post" | "comment" =
    body.content_type === "post" ? "post" : "comment";

  const created = await MyGlobal.prisma.discuss_board_content_reports.create({
    data: {
      id: reportId,
      reporter_member_id: member.id,
      content_post_id: hasPostId ? body.content_post_id : null,
      content_comment_id: hasCommentId ? body.content_comment_id : null,
      content_type: contentType,
      reason: body.reason,
      status: "pending",
      moderation_action_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // --- Return API DTO (convert all date fields to branded string) ---
  return {
    id: created.id,
    reporter_member_id: created.reporter_member_id,
    content_post_id: created.content_post_id ?? undefined,
    content_comment_id: created.content_comment_id ?? undefined,
    content_type: created.content_type as "post" | "comment",
    reason: created.reason,
    status: created.status,
    moderation_action_id: created.moderation_action_id ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
