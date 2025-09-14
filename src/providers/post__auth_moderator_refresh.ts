import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function post__auth_moderator_refresh(props: {
  moderator: ModeratorPayload;
  body: IDiscussBoardModerator.IRefresh;
}): Promise<IDiscussBoardModerator.IAuthorized> {
  const { body } = props;
  let payloadDecoded: { [key: string]: unknown } = {};
  try {
    payloadDecoded = jwt.verify(
      body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { [key: string]: unknown };
  } catch {
    throw new Error("Invalid or expired refresh_token");
  }

  const jwtId =
    typeof payloadDecoded["jti"] === "string"
      ? payloadDecoded["jti"]
      : undefined;
  const userAccountId =
    typeof payloadDecoded["sub"] === "string"
      ? payloadDecoded["sub"]
      : undefined;
  if (!jwtId || !userAccountId) throw new Error("Malformed refresh_token");

  const session = await MyGlobal.prisma.discuss_board_jwt_sessions.findFirst({
    where: {
      jwt_id: jwtId,
      user_account_id: userAccountId,
      revoked_at: null,
      deleted_at: null,
    },
  });
  if (!session) throw new Error("Session not found or revoked");

  const now = new Date();
  const nowIso = toISOStringSafe(now);
  if (now > session.expires_at) throw new Error("Session expired");

  const user = await MyGlobal.prisma.discuss_board_user_accounts.findUnique({
    where: { id: userAccountId },
  });
  if (!user || user.deleted_at) throw new Error("User not found or deleted");

  const member = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: { user_account_id: user.id, deleted_at: null, status: "active" },
  });
  if (!member) throw new Error("Moderator not linked to active member");

  const moderator = await MyGlobal.prisma.discuss_board_moderators.findFirst({
    where: {
      member_id: member.id,
      status: "active",
      revoked_at: null,
      deleted_at: null,
    },
  });
  if (!moderator) throw new Error("Moderator assignment missing or inactive");

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 3600 * 1000);
  const refreshExpiresAt = new Date(
    issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const newJwtId = v4();

  const accessToken = jwt.sign(
    { id: user.id, type: "moderator" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: 3600, issuer: "autobe", jwtid: newJwtId, subject: user.id },
  );
  const refreshToken = jwt.sign(
    { id: user.id, type: "moderator" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe", jwtid: newJwtId, subject: user.id },
  );
  const refreshTokenHash = await MyGlobal.password.hash(refreshToken);

  await MyGlobal.prisma.discuss_board_jwt_sessions.update({
    where: { id: session.id },
    data: {
      jwt_id: newJwtId,
      issued_at: toISOStringSafe(issuedAt),
      expires_at: toISOStringSafe(refreshExpiresAt),
      updated_at: toISOStringSafe(issuedAt),
      refresh_token_hash: refreshTokenHash,
    },
  });

  return {
    id: moderator.id,
    member_id: member.id,
    assigned_by_administrator_id: moderator.assigned_by_administrator_id,
    assigned_at: toISOStringSafe(moderator.assigned_at),
    revoked_at: moderator.revoked_at
      ? toISOStringSafe(moderator.revoked_at)
      : null,
    status: moderator.status,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(expiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
    member: { id: member.id, nickname: member.nickname, status: member.status },
  };
}
