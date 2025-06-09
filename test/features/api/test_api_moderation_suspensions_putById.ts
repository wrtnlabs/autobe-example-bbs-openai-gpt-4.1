import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ISuspension";

export async function test_api_moderation_suspensions_putById(
  connection: api.IConnection,
) {
  const output: ISuspension =
    await api.functional.moderation.suspensions.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ISuspension.IUpdate>(),
    });
  typia.assert(output);
}
