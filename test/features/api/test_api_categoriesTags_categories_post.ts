import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ICategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategory";

export async function test_api_categoriesTags_categories_post(
  connection: api.IConnection,
) {
  const output: ICategory = await api.functional.categoriesTags.categories.post(
    connection,
    {
      body: typia.random<ICategory.ICreate>(),
    },
  );
  typia.assert(output);
}
