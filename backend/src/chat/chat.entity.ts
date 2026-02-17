// src/chat/chat.entity.ts
import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
} from "typeorm";
import { ChatMessage } from "../../../shared/chat.interface";

@Entity() // 「これはDBのテーブルですよ」というラベル
export class Chat implements ChatMessage {
	@PrimaryGeneratedColumn() // 自動で増えるID（1, 2, 3...）
	id: number;

	@Column()
	sender: string;

	@Column("text") // 長文対応
	content: string;

	@Column()
	roomId: string;

	@CreateDateColumn() // データが入った瞬間の時刻を自動で記録
	createdAt: Date;
}
