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

	@Column({ nullable: true })
	winnerUserId: number | null;

	@Column({ nullable: true })
	loserUserId: number | null;

	@Column()
	winnerScore: number;

	@Column()
	loserScore: number;

	@CreateDateColumn()
	createdAt: Date;
}
