import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISiteSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISiteSettings";

export async function test_api_settings_siteSettings_eraseById(
  connection: api.IConnection,
) {
  const output: ISiteSettings =
    await api.functional.settings.siteSettings.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
