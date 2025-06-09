import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIComment";
import { IComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IComment";

export async function test_api_comments_comments_patch(
  connection: api.IConnection,
) {
  const output: IPageIComment = await api.functional.comments.comments.patch(
    connection,
    {
      body: typia.random<IComment.IRequest>(),
    },
  );
  typia.assert(output);
}
