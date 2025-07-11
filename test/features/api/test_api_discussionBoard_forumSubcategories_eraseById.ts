import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardForumSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategory";

export async function test_api_discussionBoard_forumSubcategories_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumSubcategory =
    await api.functional.discussionBoard.forumSubcategories.eraseById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
