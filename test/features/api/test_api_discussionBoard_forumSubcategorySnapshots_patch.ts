import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardForumSubcategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardForumSubcategorySnapshot";
import { IDiscussionBoardForumSubcategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardForumSubcategorySnapshot";

export async function test_api_discussionBoard_forumSubcategorySnapshots_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardForumSubcategorySnapshot =
    await api.functional.discussionBoard.forumSubcategorySnapshots.patch(
      connection,
      {
        body: typia.random<IDiscussionBoardForumSubcategorySnapshot.IRequest>(),
      },
    );
  typia.assert(output);
}
