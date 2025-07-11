import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardWarning";
import { IDiscussionBoardWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardWarning";

export async function test_api_discussionBoard_warnings_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardWarning =
    await api.functional.discussionBoard.warnings.patch(connection, {
      body: typia.random<IDiscussionBoardWarning.IRequest>(),
    });
  typia.assert(output);
}
