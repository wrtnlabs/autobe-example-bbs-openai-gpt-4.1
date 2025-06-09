import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPost";

export async function test_api_posts_posts_eraseById(
  connection: api.IConnection,
) {
  const output: IPost.IDeleteResult =
    await api.functional.posts.posts.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
