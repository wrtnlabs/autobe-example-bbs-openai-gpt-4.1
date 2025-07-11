import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardThreadTag";
import { IDiscussionBoardThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardThreadTag";

export async function test_api_discussionBoard_threadTags_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardThreadTag =
    await api.functional.discussionBoard.threadTags.patch(connection, {
      body: typia.random<IDiscussionBoardThreadTag.IRequest>(),
    });
  typia.assert(output);
}
