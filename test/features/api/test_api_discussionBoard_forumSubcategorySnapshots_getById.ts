import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardForumSubcategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategorySnapshot";

export async function test_api_discussionBoard_forumSubcategorySnapshots_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumSubcategorySnapshot =
    await api.functional.discussionBoard.forumSubcategorySnapshots.getById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
