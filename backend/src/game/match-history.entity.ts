import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
} from "typeorm";

@Entity()
export class MatchHistory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	winnerId: string; // 勝者のソケットID（後方互換用）

	@Column()
	loserId: string; // 敗者のソケットID（後方互換用）

	// ユーザーIDで統計を集計するための列（nullable: 認証なしゲームとの後方互換）
	@Column({ nullable: true })
	winnerUserId?: number;

	@Column({ nullable: true })
	loserUserId?: number;

	@Column()
	winnerScore: number;

	@Column()
	loserScore: number;

	@CreateDateColumn()
	createdAt: Date; // 試合が行われた日時
}
