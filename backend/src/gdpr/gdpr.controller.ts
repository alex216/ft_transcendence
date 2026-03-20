import {
	Controller,
	Get,
	Delete,
	Req,
	Res,
	HttpCode,
	HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { GdprService } from "./gdpr.service";
import { User } from "../user/user.entity";

interface AuthenticatedRequest extends Request {
	user: User;
}

@Controller("gdpr")
export class GdprController {
	constructor(private readonly gdprService: GdprService) {}

	// GET /gdpr/export
	// 自分の全データをJSONでダウンロードする（GDPR データポータビリティ権）
	@Get("export")
	async exportMyData(
		@Req() req: AuthenticatedRequest,
		@Res() res: Response,
	): Promise<void> {
		const data = await this.gdprService.exportUserData(
			req.user.id,
			req.user.username,
		);

		res.setHeader("Content-Type", "application/json");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="my-data-${req.user.username}.json"`,
		);
		res.send(JSON.stringify(data, null, 2));
	}

	// DELETE /gdpr/account
	// アカウントと全関連データを完全削除する（GDPR 消去権・忘れられる権利）
	@Delete("account")
	@HttpCode(HttpStatus.NO_CONTENT)
	async deleteMyAccount(
		@Req() req: AuthenticatedRequest,
		@Res({ passthrough: true }) res: Response,
	): Promise<void> {
		await this.gdprService.deleteAccount(req.user.id, req.user.username);

		// JWTクッキーを削除してログアウト状態にする
		res.clearCookie("access_token");
		res.clearCookie("temp_token");
	}
}
