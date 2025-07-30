import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPostAttachment";

/**
 * Test searching for attachments on a discussion board post by filename and
 * MIME type.
 *
 * This test ensures that the attachment search endpoint accurately returns only
 * the attachments matching the provided filename fragment and MIME type.
 *
 * Steps:
 *
 * 1. Simulate an existing thread ID (thread creation not available in API scope)
 * 2. Create a post within that thread via the member.threads.posts.create endpoint
 * 3. Upload multiple attachments to the post, varying the filename and MIME type
 * 4. Use the attachments.search (PATCH) endpoint with a filename fragment and MIME
 *    type filter
 * 5. Validate that: a) Each returned attachment matches both filters b) Count of
 *    results matches ground-truth expectation c) Only correct attachments are
 *    present
 */
export async function test_api_discussionBoard_test_search_post_attachments_by_filename_and_type(
  connection: api.IConnection,
) {
  // 1. Simulate a thread ID (since thread creation not in API scope)
  const threadId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Create a post in the thread
  const post = await api.functional.discussionBoard.member.threads.posts.create(
    connection,
    {
      threadId,
      body: {
        discussion_board_thread_id: threadId,
        body: RandomGenerator.paragraph()(),
      },
    },
  );
  typia.assert(post);

  // 3. Upload a set of attachments with varied filenames and MIME types
  const filesToUpload = [
    { file_name: "dog_picture.jpg", mime_type: "image/jpeg" },
    { file_name: "cat_document.pdf", mime_type: "application/pdf" },
    { file_name: "dog_documentation.pdf", mime_type: "application/pdf" },
    { file_name: "fish_picture.jpg", mime_type: "image/jpeg" },
  ];
  const uploaded: IDiscussionBoardPostAttachment[] = [];
  for (const f of filesToUpload) {
    const attachment =
      await api.functional.discussionBoard.member.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: {
            discussion_board_post_id: post.id,
            uploader_member_id: post.creator_member_id,
            file_uri: typia.random<string & tags.Format<"uri">>(),
            file_name: f.file_name,
            mime_type: f.mime_type,
          },
        },
      );
    typia.assert(attachment);
    uploaded.push(attachment);
  }

  // 4. Search for attachments with "dog" in the name and "application/pdf" MIME type
  const searchResult =
    await api.functional.discussionBoard.posts.attachments.search(connection, {
      postId: post.id,
      body: {
        discussion_board_post_id: post.id,
        file_name: "dog",
        mime_type: "application/pdf",
      },
    });
  typia.assert(searchResult);

  // 5. Validate that all results conform to filters and result set is correct
  for (const att of searchResult.data) {
    TestValidator.predicate("filename contains 'dog'")(
      att.file_name.includes("dog"),
    );
    TestValidator.equals("mime_type matches filter")(att.mime_type)(
      "application/pdf",
    );
    TestValidator.equals("post id matches")(att.discussion_board_post_id)(
      post.id,
    );
  }
  // Find expected set locally
  const expected = uploaded.filter(
    (x) => x.file_name.includes("dog") && x.mime_type === "application/pdf",
  );
  TestValidator.equals("result count matches expected")(
    searchResult.data.length,
  )(expected.length);
  for (const e of expected) {
    const found = searchResult.data.find((x) => x.id === e.id);
    TestValidator.predicate("attachment is in result")(!!found);
  }
}
