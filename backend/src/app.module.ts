import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseConfig } from "./database.config";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { ProfileModule } from "./profile/profile.module";
import { FriendModule } from "./friend/friend.module";
import { ChatModule } from "./chat/chat.module";
import { GameModule } from "./game/game.module";
import { StatsModule } from "./stats/stats.module";
import { GdprModule } from "./gdpr/gdpr.module";
import { HealthController } from "./health.controller";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";

// アプリケーションのルートモジュール
// C++で言うと「プログラム全体の設定」
@Module({
	imports: [
		TypeOrmModule.forRoot(databaseConfig), // データベース接続
		AuthModule, // 認証機能
		UserModule,
		ProfileModule, // プロフィール機能（マイルストーン#3）
		FriendModule, // フレンド機能（マイルストーン#3）
		ChatModule, // チャット機能（マイルストーン#4）
		GameModule, // ゲーム機能（マイルストーン#4）
		StatsModule, // ユーザー統計 API（マイルストーン#8）
		GdprModule, // GDPR対応 API（マイルストーン#8）
	],
	controllers: [HealthController],
	providers: [
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard,
		},
		// ... other providers
	],
})
export class AppModule {}
