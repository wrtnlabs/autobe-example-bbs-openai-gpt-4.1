import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPost";

export async function test_api_threadsPosts_posts_post(
  connection: api.IConnection,
) {
  const output: IPost = await api.functional.threadsPosts.posts.post(
    connection,
    {
      body: typia.random<IPost.ICreate>(),
    },
  );
  typia.assert(output);
}
