import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

export async function test_api_discussionBoard_warnings_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardWarning =
    await api.functional.discussionBoard.warnings.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardWarning.IUpdate>(),
    });
  typia.assert(output);
}
