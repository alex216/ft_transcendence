import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GameGateway } from "./game.gateway";
import { GameService } from "./game.service";
import { MatchHistory } from "./match-history.entity";
import { AuthModule } from "../auth/auth.module";

@Module({
	imports: [
		// 試合結果を保存するために MatchHistory エンティティを登録
		TypeOrmModule.forFeature([MatchHistory]),
		AuthModule,
	],
	providers: [
		GameGateway, // WebSocketの窓口
		GameService, // ゲームロジック
	],
})
export class GameModule {}
