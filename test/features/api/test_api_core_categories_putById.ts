import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategory";

export async function test_api_core_categories_putById(
  connection: api.IConnection,
) {
  const output: ICategory = await api.functional.core.categories.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ICategory.IUpdate>(),
    },
  );
  typia.assert(output);
}
