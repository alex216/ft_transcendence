// src/chat/chat.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Chat } from "./chat.entity";
import { ChatMessage } from "../../../shared/chat.interface";

@Injectable() // 「このクラスは他の場所（Gatewayなど）で呼び出せる職人です」という宣言
export class ChatService {
	constructor(
		// 魔法の道具「Repository」を、NestJSから貸してもらう（注入する）
		@InjectRepository(Chat)
		private chatRepository: Repository<Chat>,
	) {}

	// 仕事：送られてきたデータをDBに保存する
	async saveMessage(data: ChatMessage): Promise<Chat> {
		// 1. 新しいチャットのデータを作成する
		const newMessage = this.chatRepository.create(data);

		// 2. 実際にデータベース（PostgreSQL）に保存し、その結果を返す
		return await this.chatRepository.save(newMessage);
	}

	// 仕事：過去のメッセージをすべて取得する（あとで使います）
	async getMessagesByRoom(roomId: string): Promise<Chat[]> {
		return await this.chatRepository.find({
			where: { roomId },
			order: { createdAt: "ASC" }, // 古い順（チャットの流れ通り）
		});
	}
}
