import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITag";

export async function test_api_categoriesTags_tags_putById(
  connection: api.IConnection,
) {
  const output: ITag = await api.functional.categoriesTags.tags.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ITag.IUpdate>(),
    },
  );
  typia.assert(output);
}
