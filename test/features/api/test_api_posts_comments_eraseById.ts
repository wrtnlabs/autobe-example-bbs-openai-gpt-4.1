import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IComment";

export async function test_api_posts_comments_eraseById(
  connection: api.IConnection,
) {
  const output: IComment.IDeleteResult =
    await api.functional.posts.comments.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
