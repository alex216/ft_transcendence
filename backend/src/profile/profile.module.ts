import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { Profile } from "./profile.entity";
import { User } from "../user/user.entity";

@Module({
	imports: [
		TypeOrmModule.forFeature([Profile, User]), // ProfileとUserエンティティを使用
	],
	controllers: [ProfileController],
	providers: [ProfileService],
	exports: [ProfileService], // 他のモジュールから使えるようにexport
})
export class ProfileModule {}
