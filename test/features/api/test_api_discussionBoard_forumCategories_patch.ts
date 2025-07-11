import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageDiscussionBoardForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageDiscussionBoardForumCategory";
import { IDiscussionBoardForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumCategory";

export async function test_api_discussionBoard_forumCategories_patch(
  connection: api.IConnection,
) {
  const output: IPageDiscussionBoardForumCategory =
    await api.functional.discussionBoard.forumCategories.patch(connection, {
      body: typia.random<IDiscussionBoardForumCategory.IRequest>(),
    });
  typia.assert(output);
}
