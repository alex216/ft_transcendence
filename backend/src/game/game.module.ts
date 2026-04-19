import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { GameGateway } from "./game.gateway";
import { GameService } from "./game.service";
import { MatchHistory } from "./match-history.entity";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";

@Module({
	imports: [
		// 試合結果を保存するために MatchHistory エンティティを登録
		TypeOrmModule.forFeature([MatchHistory]),
		AuthModule,
		UserModule, // UserStatusService を使うために追加
		JwtModule.register({
			secret: process.env.JWT_SECRET || "fallback-jwt-secret",
		}),
	],
	providers: [
		GameGateway, // WebSocketの窓口
		GameService, // ゲームロジック
	],
	exports: [TypeOrmModule], // StatsModule から MatchHistory を使えるようにする
})
export class GameModule {}
