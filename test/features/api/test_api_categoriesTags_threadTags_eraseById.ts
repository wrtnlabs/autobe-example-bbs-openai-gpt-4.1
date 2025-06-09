import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IThreadTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IThreadTag";

export async function test_api_categoriesTags_threadTags_eraseById(
  connection: api.IConnection,
) {
  const output: IThreadTag.IDeleteResult =
    await api.functional.categoriesTags.threadTags.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
