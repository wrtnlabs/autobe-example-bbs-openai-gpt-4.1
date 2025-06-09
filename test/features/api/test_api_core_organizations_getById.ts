import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrganization";

export async function test_api_core_organizations_getById(
  connection: api.IConnection,
) {
  const output: IOrganization = await api.functional.core.organizations.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
