import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
} from "typeorm";

@Entity("match_history")
export class MatchHistory {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ type: "int", nullable: true })
	winnerUserId: number | null;

	@Column({ type: "int", nullable: true })
	loserUserId: number | null;

	@Column()
	winnerScore: number;

	@Column()
	loserScore: number;

	@CreateDateColumn()
	createdAt: Date;
}
