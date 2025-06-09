import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageICategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICategory";
import { ICategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategory";

export async function test_api_core_categories_patch(
  connection: api.IConnection,
) {
  const output: IPageICategory = await api.functional.core.categories.patch(
    connection,
    {
      body: typia.random<ICategory.IRequest>(),
    },
  );
  typia.assert(output);
}
