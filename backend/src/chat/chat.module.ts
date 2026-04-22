import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { PresenceService } from "./presence.service";
import { Chat } from "./chat.entity";
import { Friend } from "../friend/friend.entity";
import { UserModule } from "../user/user.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([Chat, Friend]),
		UserModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET || "fallback-jwt-secret",
		}),
	],
	providers: [ChatGateway, ChatService, PresenceService],
	// AuthModule から PresenceService.broadcastStatusToFriends を使えるように公開
	exports: [PresenceService],
})
export class ChatModule {}
