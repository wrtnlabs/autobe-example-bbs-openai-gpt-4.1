import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommentReport";
import { ICommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentReport";

export async function test_api_moderation_commentReports_patch(
  connection: api.IConnection,
) {
  const output: IPageICommentReport.ISummary =
    await api.functional.moderation.commentReports.patch(connection, {
      body: typia.random<ICommentReport.IRequest>(),
    });
  typia.assert(output);
}
