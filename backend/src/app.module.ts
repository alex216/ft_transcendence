import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseConfig } from "./database.config";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { FriendModule } from "./friend/friend.module";
import { ChatModule } from "./chat/chat.module";
import { GameModule } from "./game/game.module";

// アプリケーションのルートモジュール
// C++で言うと「プログラム全体の設定」
@Module({
	imports: [
		TypeOrmModule.forRoot(databaseConfig), // データベース接続
		AuthModule, // 認証機能
		ProfileModule, // プロフィール機能（マイルストーン#3）
		FriendModule, // フレンド機能（マイルストーン#3）
		ChatModule, // チャット機能（マイルストーン#4）
		GameModule, // ゲーム機能（マイルストーン#4）
	],
})
export class AppModule {}
