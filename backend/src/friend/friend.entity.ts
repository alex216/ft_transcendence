import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	ManyToOne,
	JoinColumn,
	CreateDateColumn,
	Unique,
} from "typeorm";
import { User } from "../user/user.entity";

// フレンド関係テーブルの定義
// user_id と friend_id の組み合わせはユニーク（重複防止）
@Entity("friends")
@Unique(["userId", "friendId"])
export class Friend {
	@PrimaryGeneratedColumn()
	id: number;

	// ユーザーID
	@Column({ name: "user_id" })
	userId: number;

	@ManyToOne(() => User, { onDelete: "CASCADE" })
	@JoinColumn({ name: "user_id" })
	user: User;

	// フレンドのユーザーID
	@Column({ name: "friend_id" })
	friendId: number;

	@ManyToOne(() => User, { onDelete: "CASCADE" })
	@JoinColumn({ name: "friend_id" })
	friend: User;

	@CreateDateColumn()
	createdAt: Date;
}
