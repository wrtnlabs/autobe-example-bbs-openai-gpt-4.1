import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_discussionBoard_reports_eraseById(
  connection: api.IConnection,
) {
  const output = await api.functional.discussionBoard.reports.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
