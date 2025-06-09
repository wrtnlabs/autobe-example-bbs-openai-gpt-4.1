import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommentReport";

export async function test_api_moderation_commentReports_getById(
  connection: api.IConnection,
) {
  const output: ICommentReport =
    await api.functional.moderation.commentReports.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
