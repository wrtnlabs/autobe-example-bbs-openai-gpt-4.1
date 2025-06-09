import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadTag";

export async function test_api_categoriesTags_threadTags_post(
  connection: api.IConnection,
) {
  const output: IThreadTag =
    await api.functional.categoriesTags.threadTags.post(connection, {
      body: typia.random<IThreadTag.ICreate>(),
    });
  typia.assert(output);
}
