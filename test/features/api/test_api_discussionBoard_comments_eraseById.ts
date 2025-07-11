import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDeleteResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDeleteResult";

export async function test_api_discussionBoard_comments_eraseById(
  connection: api.IConnection,
) {
  const output: IDeleteResult =
    await api.functional.discussionBoard.comments.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
