import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreadTag";

export async function test_api_discussionBoard_threadTags_eraseById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardThreadTag =
    await api.functional.discussionBoard.threadTags.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
