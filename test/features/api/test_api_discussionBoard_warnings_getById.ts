import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

export async function test_api_discussionBoard_warnings_getById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardWarning =
    await api.functional.discussionBoard.warnings.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
