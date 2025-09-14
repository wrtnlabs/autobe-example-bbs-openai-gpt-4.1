import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPostEditHistory";

/**
 * Get details for a single edit history entry by postId and editHistoryId.
 *
 * This endpoint allows retrieval of a specific edit history record for a given
 * post, providing a complete snapshot of that version's title, body, editor,
 * timestamp, and optional reason. Edit histories are publicly accessible for
 * transparency, but undo/rollback is handled elsewhere. Throws an error if the
 * edit history is not found or does not correspond to the provided post.
 *
 * @param props - Parameters for history lookup
 * @param props.postId - The UUID of the post whose edit history is being
 *   retrieved
 * @param props.editHistoryId - The UUID of the edit history entry
 * @returns The full detail for the specified post edit history
 * @throws {Error} If the post/edit history does not exist or association is
 *   invalid
 */
export async function get__discussBoard_posts_$postId_editHistories_$editHistoryId(props: {
  postId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardPostEditHistory> {
  const { postId, editHistoryId } = props;
  const edit =
    await MyGlobal.prisma.discuss_board_post_edit_histories.findFirstOrThrow({
      where: {
        id: editHistoryId,
        post_id: postId,
      },
      select: {
        id: true,
        post_id: true,
        editor_id: true,
        edited_title: true,
        edited_body: true,
        edit_reason: true,
        edit_timestamp: true,
      },
    });
  return {
    id: edit.id,
    post_id: edit.post_id,
    editor_id: edit.editor_id,
    edited_title: edit.edited_title,
    edited_body: edit.edited_body,
    edit_reason: edit.edit_reason ?? undefined,
    edit_timestamp: toISOStringSafe(edit.edit_timestamp),
  };
}
