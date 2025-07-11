import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardForumSubcategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategorySnapshot";

export async function test_api_discussionBoard_forumSubcategorySnapshots_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardForumSubcategorySnapshot =
    await api.functional.discussionBoard.forumSubcategorySnapshots.post(
      connection,
      {
        body: typia.random<IDiscussionBoardForumSubcategorySnapshot.ICreate>(),
      },
    );
  typia.assert(output);
}
