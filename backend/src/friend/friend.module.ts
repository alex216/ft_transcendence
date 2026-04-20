import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FriendController } from "./friend.controller";
import { FriendService } from "./friend.service";
import { FriendRequest } from "./friend-request.entity";
import { Friend } from "./friend.entity";
import { User } from "../user/user.entity";
import { ProfileModule } from "../profile/profile.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([FriendRequest, Friend, User]),
		ProfileModule, // ProfileServiceを使用するためimport
	],
	controllers: [FriendController],
	providers: [FriendService],
	exports: [FriendService],
})
export class FriendModule {}
