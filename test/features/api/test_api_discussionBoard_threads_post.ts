import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

export async function test_api_discussionBoard_threads_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardThread =
    await api.functional.discussionBoard.threads.post(connection, {
      body: typia.random<IDiscussionBoardThread.ICreate>(),
    });
  typia.assert(output);
}
