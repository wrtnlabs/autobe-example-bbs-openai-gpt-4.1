import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardForumCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardForumCategorySnapshot";
import { IDiscussionBoardForumCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumCategorySnapshot";

export async function test_api_discussionBoard_forumCategorySnapshots_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardForumCategorySnapshot =
    await api.functional.discussionBoard.forumCategorySnapshots.patch(
      connection,
      {
        body: typia.random<IDiscussionBoardForumCategorySnapshot.IRequest>(),
      },
    );
  typia.assert(output);
}
