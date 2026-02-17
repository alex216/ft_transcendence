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
	winnerId: string; // 勝者のID（または名前）

	@Column()
	loserId: string; // 敗者のID

	@Column()
	winnerScore: number;

	@Column()
	loserScore: number;

	@CreateDateColumn()
	createdAt: Date; // 試合が行われた日時
}
