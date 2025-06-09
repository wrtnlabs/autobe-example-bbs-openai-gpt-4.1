import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ITag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITag";

export async function test_api_categoriesTags_tags_eraseById(
  connection: api.IConnection,
) {
  const output: ITag.IDeleteResult =
    await api.functional.categoriesTags.tags.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
