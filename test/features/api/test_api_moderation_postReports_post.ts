import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostReport";

export async function test_api_moderation_postReports_post(
  connection: api.IConnection,
) {
  const output: IPostReport = await api.functional.moderation.postReports.post(
    connection,
    {
      body: typia.random<IPostReport.ICreate>(),
    },
  );
  typia.assert(output);
}
