import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIBan";
import { IBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IBan";

export async function test_api_moderation_bans_patch(
  connection: api.IConnection,
) {
  const output: IPageIBan = await api.functional.moderation.bans.patch(
    connection,
    {
      body: typia.random<IBan.IRequest>(),
    },
  );
  typia.assert(output);
}
