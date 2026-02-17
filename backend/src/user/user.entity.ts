import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

// ユーザーテーブルの定義
// C++で言うと struct のようなもの
@Entity("users")
export class User {
	// 自動採番されるID（PRIMARY KEY）
	@PrimaryGeneratedColumn()
	id: number;

	// ユーザー名（重複不可）
	@Column({ unique: true })
	username: string;

	// パスワード（MVPなので平文保存）
	@Column()
	password: string;

	// 作成日時
	@Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
	created_at: Date;
}
