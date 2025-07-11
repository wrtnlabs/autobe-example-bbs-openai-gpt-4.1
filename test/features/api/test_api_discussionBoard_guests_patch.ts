import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageDiscussionBoardGuest";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_discussionBoard_guests_patch(
  connection: api.IConnection,
) {
  const output: IPageDiscussionBoardGuest =
    await api.functional.discussionBoard.guests.patch(connection, {
      body: typia.random<IDiscussionBoardGuest.IRequest>(),
    });
  typia.assert(output);
}
