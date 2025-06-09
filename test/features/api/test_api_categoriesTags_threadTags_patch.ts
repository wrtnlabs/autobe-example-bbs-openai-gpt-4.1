import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIThreadTag";
import { IThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadTag";

export async function test_api_categoriesTags_threadTags_patch(
  connection: api.IConnection,
) {
  const output: IPageIThreadTag =
    await api.functional.categoriesTags.threadTags.patch(connection, {
      body: typia.random<IThreadTag.IRequest>(),
    });
  typia.assert(output);
}
