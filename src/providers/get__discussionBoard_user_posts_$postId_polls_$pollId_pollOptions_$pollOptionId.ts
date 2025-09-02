import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves a single poll option detail for a specific poll attached to a post,
 * providing label, sequence order, and option meta-data.
 *
 * This endpoint fetches the details of the specified poll option belonging to a
 * particular poll under a post. It ensures the poll option, its parent poll,
 * and parent post exist, and are not deleted. Requires authenticated user
 * access. Throws if any entity does not exist, is soft-deleted, or if the poll
 * option does not belong to the correct parent poll and post.
 *
 * @param props - Request properties
 * @param props.user - The authenticated user requesting the poll option
 *   (authorization required)
 * @param props.postId - Unique identifier of the parent post
 * @param props.pollId - Unique identifier of the poll
 * @param props.pollOptionId - Unique identifier of the poll option
 * @returns The requested poll option's detail including option text, sequence,
 *   and soft-delete flag.
 * @throws {Error} If the poll option, poll, or post does not exist or is
 *   deleted, or does not match expected relationships.
 */
export async function get__discussionBoard_user_posts_$postId_polls_$pollId_pollOptions_$pollOptionId(props: {
  user: import("../decorators/payload/UserPayload").UserPayload;

  postId: string & import("typia").tags.Format<"uuid">;

  pollId: string & import("typia").tags.Format<"uuid">;

  pollOptionId: string & import("typia").tags.Format<"uuid">;
}): Promise<
  import("../api/structures/IDiscussionBoardPollOption").IDiscussionBoardPollOption
> {
  const { user, postId, pollId, pollOptionId } = props;

  // Step 1: Fetch poll option, ensure it is not deleted and belongs to poll
  const pollOption =
    await MyGlobal.prisma.discussion_board_poll_options.findFirst({
      where: {
        id: pollOptionId,
        discussion_board_poll_id: pollId,
        deleted_at: null,
      },
    });
  if (!pollOption) {
    throw new Error(
      "Poll option not found, soft-deleted, or not in the specified poll.",
    );
  }

  // Step 2: Fetch poll to check soft-deletion and parent post relationship
  const poll = await MyGlobal.prisma.discussion_board_polls.findFirst({
    where: {
      id: pollId,
      deleted_at: null,
    },
  });
  if (!poll) {
    throw new Error("Poll not found or has been deleted.");
  }
  if (
    typeof poll.discussion_board_post_id !== "string" ||
    poll.discussion_board_post_id !== postId
  ) {
    throw new Error("Poll is not attached to the specified post.");
  }

  // Step 3: Fetch post to check soft-deletion
  const post = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (!post) {
    throw new Error("Post not found or has been deleted.");
  }

  // Step 4: Map fields and convert Date fields to ISO strings
  return {
    id: pollOption.id,
    discussion_board_poll_id: pollOption.discussion_board_poll_id,
    option_text: pollOption.option_text,
    sequence: pollOption.sequence,
    created_at: toISOStringSafe(pollOption.created_at),
    updated_at: toISOStringSafe(pollOption.updated_at),
    deleted_at: pollOption.deleted_at
      ? toISOStringSafe(pollOption.deleted_at)
      : null,
  };
}
