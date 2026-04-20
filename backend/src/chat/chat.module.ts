import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { Chat } from "./chat.entity";
import { Friend } from "../friend/friend.entity";
import { UserModule } from "../user/user.module";

@Module({
	// 設計図（Chat）の使用許可を出す
	imports: [
		// ChatGateway.handleDisconnect から friend 一覧を引くため Friend も forFeature に追加
		TypeOrmModule.forFeature([Chat, Friend]),
		UserModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET || "fallback-jwt-secret",
		}),
	],
	// 窓口と職人をチームに登録する
	providers: [ChatGateway, ChatService],
	// 他モジュール（AuthModule など）から ChatGateway.emitToUsers を呼べるように公開
	exports: [ChatGateway],
})
export class ChatModule {}
