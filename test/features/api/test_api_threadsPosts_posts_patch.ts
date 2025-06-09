import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPost";
import { IPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPost";

export async function test_api_threadsPosts_posts_patch(
  connection: api.IConnection,
) {
  const output: IPageIPost.ISummary =
    await api.functional.threadsPosts.posts.patch(connection, {
      body: typia.random<IPost.IRequest>(),
    });
  typia.assert(output);
}
