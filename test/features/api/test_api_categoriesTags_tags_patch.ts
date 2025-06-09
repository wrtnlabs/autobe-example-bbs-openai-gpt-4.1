import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageITag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITag";
import { ITag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITag";

export async function test_api_categoriesTags_tags_patch(
  connection: api.IConnection,
) {
  const output: IPageITag = await api.functional.categoriesTags.tags.patch(
    connection,
    {
      body: typia.random<ITag.IRequest>(),
    },
  );
  typia.assert(output);
}
