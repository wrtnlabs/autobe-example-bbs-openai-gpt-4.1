import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentReport";

export async function test_api_moderation_commentReports_putById(
  connection: api.IConnection,
) {
  const output: ICommentReport =
    await api.functional.moderation.commentReports.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICommentReport.IUpdate>(),
    });
  typia.assert(output);
}
