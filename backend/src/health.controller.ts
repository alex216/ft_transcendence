import { Controller, Get } from "@nestjs/common";
import { Public } from "./auth/decorators/public.decorator";
import { DataSource } from "typeorm";

// ヘルスチェック用コントローラー
// docker-compose の healthcheck がこのエンドポイントを叩いて
// バックエンドの準備完了を判定する
@Controller("health")
export class HealthController {
	constructor(private readonly dataSource: DataSource) {}

	@Public()
	@Get()
	async check() {
		const isDbConnected = this.dataSource.isInitialized;
		if (!isDbConnected) {
			throw new Error("Database not connected");
		}
		return { status: "ok" };
	}
}
