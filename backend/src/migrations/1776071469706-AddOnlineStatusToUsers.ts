import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnlineStatusToUsers1776071469706 implements MigrationInterface {
	name = "AddOnlineStatusToUsers1776071469706";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "users" ADD "is_online" boolean NOT NULL DEFAULT false`,
		);
		await queryRunner.query(`ALTER TABLE "users" ADD "last_seen_at" TIMESTAMP`);
		await queryRunner.query(
			`ALTER TABLE "users" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_seen_at"`);
		await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_online"`);
	}
}
