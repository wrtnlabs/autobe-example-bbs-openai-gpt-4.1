import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageISuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISuspension";
import { ISuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ISuspension";

export async function test_api_moderation_suspensions_patch(
  connection: api.IConnection,
) {
  const output: IPageISuspension.ISummary =
    await api.functional.moderation.suspensions.patch(connection, {
      body: typia.random<ISuspension.IRequest>(),
    });
  typia.assert(output);
}
