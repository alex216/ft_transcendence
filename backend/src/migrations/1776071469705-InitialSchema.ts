import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1776071469705 implements MigrationInterface {
	name = "InitialSchema1776071469705";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "users" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "password" character varying, "forty_two_id" character varying, "is_2fa_enabled" boolean NOT NULL DEFAULT false, "two_factor_secret" character varying, "is_online" boolean NOT NULL DEFAULT false, "last_seen_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "UQ_37890d24939a3c94ed03089ab88" UNIQUE ("forty_two_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "profiles" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "displayName" character varying(50), "bio" text, "avatarUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_9e432b7df0d182f8d292902d1a" UNIQUE ("user_id"), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "match_history" ("id" SERIAL NOT NULL, "winnerUserId" integer, "loserUserId" integer, "winnerScore" integer NOT NULL, "loserScore" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_efc236c939f8248229d873f4893" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "friends" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "friend_id" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_99b814d75e2f39700ad0e0827f6" UNIQUE ("user_id", "friend_id"), CONSTRAINT "PK_65e1b06a9f379ee5255054021e1" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TYPE "public"."friend_requests_status_enum" AS ENUM('pending', 'accepted', 'rejected')`,
		);
		await queryRunner.query(
			`CREATE TABLE "friend_requests" ("id" SERIAL NOT NULL, "sender_id" integer NOT NULL, "receiver_id" integer NOT NULL, "status" "public"."friend_requests_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3827ba86ce64ecb4b90c92eeea6" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`CREATE TABLE "chat" ("id" SERIAL NOT NULL, "sender" character varying NOT NULL, "content" text NOT NULL, "roomId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9d0b2ba74336710fd31154738a5" PRIMARY KEY ("id"))`,
		);
		await queryRunner.query(
			`ALTER TABLE "profiles" ADD CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "friends" ADD CONSTRAINT "FK_f2534e418d51fa6e5e8cdd4b480" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "friends" ADD CONSTRAINT "FK_c9d447f72456a67d17ec30c5d00" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_c034dd387df6cd4ce9aaebdd480" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
		await queryRunner.query(
			`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_781744f1014838837741581a8b7" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
		);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_781744f1014838837741581a8b7"`,
		);
		await queryRunner.query(
			`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_c034dd387df6cd4ce9aaebdd480"`,
		);
		await queryRunner.query(
			`ALTER TABLE "friends" DROP CONSTRAINT "FK_c9d447f72456a67d17ec30c5d00"`,
		);
		await queryRunner.query(
			`ALTER TABLE "friends" DROP CONSTRAINT "FK_f2534e418d51fa6e5e8cdd4b480"`,
		);
		await queryRunner.query(
			`ALTER TABLE "profiles" DROP CONSTRAINT "FK_9e432b7df0d182f8d292902d1a2"`,
		);
		await queryRunner.query(`DROP TABLE "chat"`);
		await queryRunner.query(`DROP TABLE "friend_requests"`);
		await queryRunner.query(`DROP TYPE "public"."friend_requests_status_enum"`);
		await queryRunner.query(`DROP TABLE "friends"`);
		await queryRunner.query(`DROP TABLE "match_history"`);
		await queryRunner.query(`DROP TABLE "profiles"`);
		await queryRunner.query(`DROP TABLE "users"`);
	}
}
