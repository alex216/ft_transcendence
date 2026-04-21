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

	// 【修正】nullable: true にする
	// 42 OAuthログインのユーザーはパスワードを持たないため
	@Column({ nullable: true })
	password?: string;

	// メールアドレス（GDPRメール通知用。42 OAuthログイン時に取得して保存）
	@Column({ nullable: true })
	email?: string;

	// 【新規追加】マイルストーン6: 42 OAuth連携用
	@Column({ unique: true, nullable: true })
	forty_two_id?: string;

	// 【新規追加】マイルストーン6: 二要素認証(2FA)用
	@Column({ default: false })
	is_2fa_enabled: boolean;

	@Column({ nullable: true })
	two_factor_secret?: string;

	// オンラインステータス（ログイン/ログアウト時に更新）
	@Column({ default: false })
	is_online: boolean;

	// 最終オンライン日時（切断時に更新）
	@Column({ type: "timestamp", nullable: true })
	last_seen_at?: Date;

	// 【修正】CreateDateColumnを使うとスッキリ書けます
	@CreateDateColumn({ type: "timestamp" })
	created_at: Date;

	@UpdateDateColumn({ type: "timestamp" })
	updated_at: Date;
}
