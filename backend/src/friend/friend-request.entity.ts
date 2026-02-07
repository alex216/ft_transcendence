import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "../user/user.entity";
import { FriendRequestStatus } from "../../../shared/friend.types";

// フレンドリクエストテーブルの定義
@Entity("friend_requests")
export class FriendRequest {
	@PrimaryGeneratedColumn()
	id: number;

	// リクエスト送信者のユーザーID
	@Column({ name: "sender_id" })
	senderId: number;

	@ManyToOne(() => User, { onDelete: "CASCADE" })
	@JoinColumn({ name: "sender_id" })
	sender: User;

	// リクエスト受信者のユーザーID
	@Column({ name: "receiver_id" })
	receiverId: number;

	@ManyToOne(() => User, { onDelete: "CASCADE" })
	@JoinColumn({ name: "receiver_id" })
	receiver: User;

	// リクエストのステータス（pending, accepted, rejected）
	@Column({
		type: "enum",
		enum: FriendRequestStatus,
		default: FriendRequestStatus.PENDING,
	})
	status: FriendRequestStatus;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
