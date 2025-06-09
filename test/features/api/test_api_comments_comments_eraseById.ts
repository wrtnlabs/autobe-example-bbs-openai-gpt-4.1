import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IComment";

export async function test_api_comments_comments_eraseById(
  connection: api.IConnection,
) {
  const output: IComment = await api.functional.comments.comments.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
