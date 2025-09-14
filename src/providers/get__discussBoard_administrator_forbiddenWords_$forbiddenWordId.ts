import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardForbiddenWords } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardForbiddenWords";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Get forbidden word rule detail (discuss_board_forbidden_words table)
 *
 * Retrieves the complete specification for a single forbidden word, phrase, or
 * regex rule used for content filtering on discussBoard. The record is
 * identified by its unique UUID as the forbiddenWordId parameter.
 *
 * Authorization: Requires an authenticated administrator parameter. The
 * decorator and payload strictly enforce administrator status and privilege at
 * the controller layer. No additional authorization checks are required here.
 *
 * @param props - Function parameters
 * @param props.administrator - Authenticated administrator payload (JWT bearer)
 * @param props.forbiddenWordId - UUID of the forbidden word rule to retrieve
 * @returns Full forbidden word rule record, including expression, optional
 *   description, and audit timestamps as per IDiscussBoardForbiddenWords
 * @throws {Error} If no record exists for the provided forbiddenWordId
 *   (findUniqueOrThrow throws)
 */
export async function get__discussBoard_administrator_forbiddenWords_$forbiddenWordId(props: {
  administrator: AdministratorPayload;
  forbiddenWordId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardForbiddenWords> {
  const { forbiddenWordId } = props;
  const forbiddenWord =
    await MyGlobal.prisma.discuss_board_forbidden_words.findUniqueOrThrow({
      where: { id: forbiddenWordId },
      select: {
        id: true,
        expression: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: forbiddenWord.id,
    expression: forbiddenWord.expression,
    description: forbiddenWord.description,
    created_at: toISOStringSafe(forbiddenWord.created_at),
    updated_at: toISOStringSafe(forbiddenWord.updated_at),
    deleted_at: forbiddenWord.deleted_at
      ? toISOStringSafe(forbiddenWord.deleted_at)
      : forbiddenWord.deleted_at,
  };
}
