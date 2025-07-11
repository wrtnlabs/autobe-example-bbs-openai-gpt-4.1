import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_discussionBoard_reports_patch(
  connection: api.IConnection,
) {
  const output: IPageIDiscussionBoardReport =
    await api.functional.discussionBoard.reports.patch(connection, {
      body: typia.random<IDiscussionBoardReport.IRequest>(),
    });
  typia.assert(output);
}
