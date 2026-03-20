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
	winnerUserId: number;

	@Column()
	loserUserId: number;

	@Column()
	winnerScore: number;

	@Column()
	loserScore: number;

	@CreateDateColumn()
	createdAt: Date;
}
