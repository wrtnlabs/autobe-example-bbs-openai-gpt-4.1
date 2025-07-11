import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_discussionBoard_reports_post(
  connection: api.IConnection,
) {
  const output: IDiscussionBoardReport =
    await api.functional.discussionBoard.reports.post(connection, {
      body: typia.random<IDiscussionBoardReport.ICreate>(),
    });
  typia.assert(output);
}
