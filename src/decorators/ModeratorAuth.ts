import { SwaggerCustomizer } from "@nestia/core";
import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { Singleton } from "tstl";

import { moderatorAuthorize } from "../providers/authorize/moderatorAuthorize";

/**
 * Parameter decorator for requiring moderator authentication and injecting ModeratorPayload.
 * Automatically applies Bearer token security scheme to Swagger docs.
 *
 * Usage: Use as a parameter decorator in controller methods:
 *   async someAction(@ModeratorAuth() moderator: ModeratorPayload)...
 */
export const ModeratorAuth = ():
  ParameterDecorator =>
  (target, propertyKey, parameterIndex) => {
    SwaggerCustomizer((props) => {
      props.route.security ??= [];
      props.route.security.push({ bearer: [] });
    })(target, propertyKey as string, undefined!);
    singleton.get()(target, propertyKey, parameterIndex);
  };

const singleton = new Singleton(() =>
  createParamDecorator(async (_0: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return moderatorAuthorize(request);
  })(),
);
