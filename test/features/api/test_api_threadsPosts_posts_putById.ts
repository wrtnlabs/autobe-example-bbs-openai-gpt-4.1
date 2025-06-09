import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPost";

export async function test_api_threadsPosts_posts_putById(
  connection: api.IConnection,
) {
  const output: IPost = await api.functional.threadsPosts.posts.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IPost.IUpdate>(),
    },
  );
  typia.assert(output);
}
