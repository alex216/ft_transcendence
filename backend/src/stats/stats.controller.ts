import { Controller, Get, Req } from "@nestjs/common";
import { Request } from "express";
import { StatsService } from "./stats.service";
import { User } from "../user/user.entity";

interface AuthenticatedRequest extends Request {
	user: User;
}

@Controller("stats")
export class StatsController {
	constructor(private readonly statsService: StatsService) {}

	// GET /stats/me
	// 自分の勝敗統計（勝数・負数・合計・勝率）
	@Get("me")
	async getMyStats(@Req() req: AuthenticatedRequest) {
		return this.statsService.getUserStats(req.user.id);
	}

	// GET /stats/me/match-history
	// 自分の直近20試合の履歴
	@Get("me/match-history")
	async getMyMatchHistory(@Req() req: AuthenticatedRequest) {
		return this.statsService.getMatchHistory(req.user.id);
	}
}
