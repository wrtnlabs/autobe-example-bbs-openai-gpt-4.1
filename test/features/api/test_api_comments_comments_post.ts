import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IComment";

export async function test_api_comments_comments_post(
  connection: api.IConnection,
) {
  const output: IComment = await api.functional.comments.comments.post(
    connection,
    {
      body: typia.random<IComment.ICreate>(),
    },
  );
  typia.assert(output);
}
