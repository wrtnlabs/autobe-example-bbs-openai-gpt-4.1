import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumCategory";

export async function test_api_discussionBoard_forumCategories_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumCategory =
    await api.functional.discussionBoard.forumCategories.post(connection, {
      body: typia.random<IDiscussionBoardForumCategory.ICreate>(),
    });
  typia.assert(output);
}
