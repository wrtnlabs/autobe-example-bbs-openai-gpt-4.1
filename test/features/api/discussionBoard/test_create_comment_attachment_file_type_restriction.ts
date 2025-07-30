import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";

/**
 * Validate server-side restriction of comment attachment file types
 * (negative/positive test)
 *
 * This test ensures the system prevents attaching disallowed file types (e.g.,
 * executables) as comment attachments and allows safe types (e.g., images). It
 * verifies business rules and API-layer security checks for file type
 * enforcement.
 *
 * Steps:
 *
 * 1. Admin creates a member for use in this test.
 * 2. Member creates a comment under a (random) post.
 * 3. Member attempts to attach a disallowed file type
 *    (.exe/application/x-msdownload) to comment—API must reject.
 * 4. Member attempts an allowed file type (.png/image/png)—API must accept and
 *    return the attachment record.
 * 5. All steps assert correct business logic and strict type validation.
 */
export async function test_api_discussionBoard_test_create_comment_attachment_file_type_restriction(
  connection: api.IConnection,
) {
  // 1. Admin creates a member for the attachment test
  const member = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(member);

  // 2. Member creates a comment on a random post
  const comment = await api.functional.discussionBoard.member.comments.create(
    connection,
    {
      body: {
        discussion_board_member_id: member.id,
        discussion_board_post_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph()(),
      } satisfies IDiscussionBoardComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Member tries to attach a disallowed file type (.exe/application/x-msdownload)
  await TestValidator.error(
    "disallowed file type: .exe/application/x-msdownload",
  )(() =>
    api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: "malware.exe",
          file_url: "https://cdn.example.com/malware.exe",
          mime_type: "application/x-msdownload",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    ),
  );

  // 4. Member tries to attach a permitted image file (should succeed)
  const allowed =
    await api.functional.discussionBoard.member.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          discussion_board_comment_id: comment.id,
          uploader_member_id: member.id,
          file_name: "profile.png",
          file_url: "https://cdn.example.com/profile.png",
          mime_type: "image/png",
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(allowed);
}
