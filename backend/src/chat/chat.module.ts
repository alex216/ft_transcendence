import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { Chat } from "./chat.entity";

@Module({
	// 設計図（Chat）の使用許可を出す
	imports: [TypeOrmModule.forFeature([Chat])],
	// 窓口と職人をチームに登録する
	providers: [ChatGateway, ChatService],
})
export class ChatModule {}
