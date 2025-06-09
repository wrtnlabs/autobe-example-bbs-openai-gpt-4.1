import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPostReport";
import { IPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPostReport";

export async function test_api_moderation_postReports_patch(
  connection: api.IConnection,
) {
  const output: IPageIPostReport =
    await api.functional.moderation.postReports.patch(connection, {
      body: typia.random<IPostReport.IRequest>(),
    });
  typia.assert(output);
}
