import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ISiteSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ISiteSettings";

export async function test_api_settings_siteSettings_post(
  connection: api.IConnection,
) {
  const output: ISiteSettings = await api.functional.settings.siteSettings.post(
    connection,
    {
      body: typia.random<ISiteSettings.ICreate>(),
    },
  );
  typia.assert(output);
}
