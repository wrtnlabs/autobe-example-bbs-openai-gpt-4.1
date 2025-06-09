import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ISiteSetting";

export async function test_api_settings_siteSettings_getById(
  connection: api.IConnection,
) {
  const output: ISiteSetting =
    await api.functional.settings.siteSettings.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
