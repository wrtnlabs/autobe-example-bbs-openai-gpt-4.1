import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardForumSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategory";

export async function test_api_discussionBoard_forumSubcategories_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumSubcategory =
    await api.functional.discussionBoard.forumSubcategories.putById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardForumSubcategory.IUpdate>(),
      },
    );
  typia.assert(output);
}
