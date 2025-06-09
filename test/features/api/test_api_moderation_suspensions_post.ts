import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ISuspension";

export async function test_api_moderation_suspensions_post(
  connection: api.IConnection,
) {
  const output: ISuspension = await api.functional.moderation.suspensions.post(
    connection,
    {
      body: typia.random<ISuspension.ICreate>(),
    },
  );
  typia.assert(output);
}
