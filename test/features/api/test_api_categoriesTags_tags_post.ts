import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ITag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITag";

export async function test_api_categoriesTags_tags_post(
  connection: api.IConnection,
) {
  const output: ITag = await api.functional.categoriesTags.tags.post(
    connection,
    {
      body: typia.random<ITag.ICreate>(),
    },
  );
  typia.assert(output);
}
