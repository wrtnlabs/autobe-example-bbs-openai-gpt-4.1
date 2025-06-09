import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostReport";

export async function test_api_moderation_postReports_putById(
  connection: api.IConnection,
) {
  const output: IPostReport =
    await api.functional.moderation.postReports.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IPostReport.IUpdate>(),
    });
  typia.assert(output);
}
