import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategory";

export async function test_api_categoriesTags_categories_getById(
  connection: api.IConnection,
) {
  const output: ICategory =
    await api.functional.categoriesTags.categories.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
