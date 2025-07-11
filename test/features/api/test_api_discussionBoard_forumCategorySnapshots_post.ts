import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardForumCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumCategorySnapshot";

export async function test_api_discussionBoard_forumCategorySnapshots_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumCategorySnapshot =
    await api.functional.discussionBoard.forumCategorySnapshots.post(
      connection,
      {
        body: typia.random<IDiscussionBoardForumCategorySnapshot.ICreate>(),
      },
    );
  typia.assert(output);
}
