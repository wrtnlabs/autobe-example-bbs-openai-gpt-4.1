import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentReport";

export async function test_api_moderation_commentReports_post(
  connection: api.IConnection,
) {
  const output: ICommentReport =
    await api.functional.moderation.commentReports.post(connection, {
      body: typia.random<ICommentReport.ICreate>(),
    });
  typia.assert(output);
}
