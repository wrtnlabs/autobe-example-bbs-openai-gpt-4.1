import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardThread } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThread";

export async function test_api_discussionBoard_threads_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardThread =
    await api.functional.discussionBoard.threads.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
