import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreadTag";

export async function test_api_discussionBoard_threadTags_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardThreadTag =
    await api.functional.discussionBoard.threadTags.post(connection, {
      body: typia.random<IDiscussionBoardThreadTag.ICreate>(),
    });
  typia.assert(output);
}
