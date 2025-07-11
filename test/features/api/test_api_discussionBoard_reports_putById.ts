import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_discussionBoard_reports_putById(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardReport =
    await api.functional.discussionBoard.reports.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IDiscussionBoardReport.IUpdate>(),
    });
  typia.assert(output);
}
