import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageDiscussionBoardForumSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageDiscussionBoardForumSubcategory";
import { IDiscussionBoardForumSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategory";

export async function test_api_discussionBoard_forumSubcategories_patch(
  connection: api.IConnection,
) {
  const output: IPageDiscussionBoardForumSubcategory =
    await api.functional.discussionBoard.forumSubcategories.patch(connection, {
      body: typia.random<IDiscussionBoardForumSubcategory.IRequest>(),
    });
  typia.assert(output);
}
