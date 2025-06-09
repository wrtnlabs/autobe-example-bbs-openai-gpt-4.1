import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ISuspension";

export async function test_api_moderation_suspensions_eraseById(
  connection: api.IConnection,
) {
  const output: ISuspension =
    await api.functional.moderation.suspensions.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
