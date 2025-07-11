import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

export async function test_api_discussionBoard_warnings_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardWarning =
    await api.functional.discussionBoard.warnings.post(connection, {
      body: typia.random<IDiscussionBoardWarning.ICreate>(),
    });
  typia.assert(output);
}
