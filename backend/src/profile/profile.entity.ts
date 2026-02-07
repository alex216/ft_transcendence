import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	OneToOne,
	JoinColumn,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";
import { User } from "../user/user.entity";

// プロフィールテーブルの定義
// users テーブルとOneToOne（1対1）の関係
@Entity("profiles")
export class Profile {
	@PrimaryGeneratedColumn()
	id: number;

	// ユーザーIDへの外部キー
	// OneToOne: 1人のユーザーに1つのプロフィール
	@OneToOne(() => User, { onDelete: "CASCADE" })
	@JoinColumn({ name: "user_id" })
	user: User;

	@Column({ name: "user_id" })
	userId: number;

	// 表示名（オプション、最大50文字）
	@Column({ nullable: true, length: 50 })
	displayName?: string;

	// 自己紹介（オプション、最大500文字）
	@Column({ type: "text", nullable: true })
	bio?: string;

	// アバター画像のURL（オプション）
	@Column({ nullable: true })
	avatarUrl?: string;

	// 作成日時（自動設定）
	@CreateDateColumn()
	createdAt: Date;

	// 更新日時（自動更新）
	@UpdateDateColumn()
	updatedAt: Date;
}
