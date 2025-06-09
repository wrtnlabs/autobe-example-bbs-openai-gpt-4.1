import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISiteSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISiteSettings";

export async function test_api_settings_siteSettings_putById(
  connection: api.IConnection,
) {
  const output: ISiteSettings =
    await api.functional.settings.siteSettings.putById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<ISiteSettings.IUpdate>(),
    });
  typia.assert(output);
}
