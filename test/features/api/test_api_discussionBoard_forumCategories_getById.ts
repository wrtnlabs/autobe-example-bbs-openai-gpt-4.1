import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumCategory";

export async function test_api_discussionBoard_forumCategories_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumCategory =
    await api.functional.discussionBoard.forumCategories.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
