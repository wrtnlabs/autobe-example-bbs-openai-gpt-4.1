import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadTag";

export async function test_api_categoriesTags_threadTags_putById(
  connection: api.IConnection,
) {
  const output: IThreadTag =
    await api.functional.categoriesTags.threadTags.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IThreadTag.IUpdate>(),
    });
  typia.assert(output);
}
