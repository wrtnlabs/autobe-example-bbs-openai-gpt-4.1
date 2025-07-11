import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardForumSubcategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategorySnapshot";

export async function test_api_discussionBoard_forumSubcategorySnapshots_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumSubcategorySnapshot =
    await api.functional.discussionBoard.forumSubcategorySnapshots.putById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IDiscussionBoardForumSubcategorySnapshot.IUpdate>(),
      },
    );
  typia.assert(output);
}
