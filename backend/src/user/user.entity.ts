import {
	Entity,
	Column,
	PrimaryGeneratedColumn,
	CreateDateColumn,
	UpdateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ unique: true })
	username: string;

	// 42 OAuthログインのユーザーはパスワードを持たないため nullable
	@Column({ nullable: true })
	password?: string;

	// メールアドレス（GDPRメール通知用。42 OAuthログイン時に取得して保存）
	@Column({ nullable: true })
	email?: string;

	// 42 OAuth連携用
	@Column({ unique: true, nullable: true })
	forty_two_id?: string;

	// 二要素認証(2FA)用
	@Column({ default: false })
	is_2fa_enabled: boolean;

	@Column({ nullable: true })
	two_factor_secret?: string;

	// オンラインステータス（WebSocket接続時に更新）
	@Column({ default: false })
	is_online: boolean;

	// 最終オンライン日時（切断時に更新）
	@Column({ type: "timestamp", nullable: true })
	last_seen_at?: Date;

	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;
}
