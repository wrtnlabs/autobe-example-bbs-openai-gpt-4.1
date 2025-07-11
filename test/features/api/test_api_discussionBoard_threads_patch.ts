import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageDiscussionBoardThread";
import { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

export async function test_api_discussionBoard_threads_patch(
  connection: api.IConnection,
) {
  const output: IPageDiscussionBoardThread =
    await api.functional.discussionBoard.threads.patch(connection, {
      body: typia.random<IDiscussionBoardThread.IRequest>(),
    });
  typia.assert(output);
}
