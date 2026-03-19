import { Injectable, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
	constructor(private reflector: Reflector) {
		super();
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// @Public() が付いているエンドポイントはスキップ
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);
		if (isPublic) return true;

		// SKIP_AUTH=true なら固定ユーザーを注入してスキップ
		if (process.env.SKIP_AUTH === "true") {
			const request = context.switchToHttp().getRequest();
			request.user = { id: 1, username: "test_user", is_2fa_enabled: false };
			return true;
		}

		const result = (await super.canActivate(context)) as boolean;
		return result;
	}
}
