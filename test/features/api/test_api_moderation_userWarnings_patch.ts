import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIUserWarning";
import { IUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserWarning";

export async function test_api_moderation_userWarnings_patch(
  connection: api.IConnection,
) {
  const output: IPageIUserWarning.ISummary =
    await api.functional.moderation.userWarnings.patch(connection, {
      body: typia.random<IUserWarning.IRequest>(),
    });
  typia.assert(output);
}
