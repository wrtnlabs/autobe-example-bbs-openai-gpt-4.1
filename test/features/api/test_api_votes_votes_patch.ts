import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIVote";
import { IVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IVote";

export async function test_api_votes_votes_patch(connection: api.IConnection) {
  const output: IPageIVote = await api.functional.votes.votes.patch(
    connection,
    {
      body: typia.random<IVote.IRequest>(),
    },
  );
  typia.assert(output);
}
