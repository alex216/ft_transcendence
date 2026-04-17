import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UserService } from "./user.service";
import { UserStatusService } from "./user-status.service";

@Module({
	imports: [
		// TypeORMでUserエンティティをこのモジュール内で使えるようにする
		TypeOrmModule.forFeature([User]),
	],
	providers: [UserService, UserStatusService],
	exports: [UserService, UserStatusService, TypeOrmModule], // TypeOrmModule をエクスポートして User リポジトリを他モジュールで使えるようにする
})
export class UserModule {}
