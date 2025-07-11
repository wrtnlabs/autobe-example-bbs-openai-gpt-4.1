import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreadTag";

export async function test_api_discussionBoard_threadTags_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardThreadTag =
    await api.functional.discussionBoard.threadTags.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardThreadTag.IUpdate>(),
    });
  typia.assert(output);
}
