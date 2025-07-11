import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardForumCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumCategorySnapshot";

export async function test_api_discussionBoard_forumCategorySnapshots_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumCategorySnapshot =
    await api.functional.discussionBoard.forumCategorySnapshots.eraseById(
      connection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
