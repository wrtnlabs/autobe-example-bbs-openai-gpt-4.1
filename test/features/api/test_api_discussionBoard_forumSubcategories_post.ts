import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardForumSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategory";

export async function test_api_discussionBoard_forumSubcategories_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumSubcategory =
    await api.functional.discussionBoard.forumSubcategories.post(connection, {
      body: typia.random<IDiscussionBoardForumSubcategory.ICreate>(),
    });
  typia.assert(output);
}
