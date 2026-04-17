import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { Chat } from "./chat.entity";
import { UserModule } from "../user/user.module";

@Module({
	// 設計図（Chat）の使用許可を出す
	imports: [
		TypeOrmModule.forFeature([Chat]),
		UserModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET || "fallback-jwt-secret",
		}),
	],
	// 窓口と職人をチームに登録する
	providers: [ChatGateway, ChatService],
})
export class ChatModule {}
