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
	@Get("me")
	async getMyStats(@Req() req: AuthenticatedRequest) {
		return this.statsService.getUserStats(req.user.id);
	}

	// GET /stats/me/match-history
	@Get("me/match-history")
	async getMyMatchHistory(@Req() req: AuthenticatedRequest) {
		return this.statsService.getMatchHistory(req.user.id);
	}

	// GET /stats/leaderboard
	@Get("leaderboard")
	async getLeaderboard() {
		return this.statsService.getLeaderboard();
	}
}
