import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPost";

export async function test_api_threadsPosts_posts_getById(
  connection: api.IConnection,
) {
  const output: IPost = await api.functional.threadsPosts.posts.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
