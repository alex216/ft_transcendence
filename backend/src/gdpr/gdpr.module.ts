import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/user.entity";
import { Profile } from "../profile/profile.entity";
import { MatchHistory } from "../game/match-history.entity";
import { Chat } from "../chat/chat.entity";
import { Friend } from "../friend/friend.entity";
import { GdprController } from "./gdpr.controller";
import { GdprService } from "./gdpr.service";
import { MailModule } from "../mail/mail.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([User, Profile, MatchHistory, Chat, Friend]),
		MailModule,
	],
	controllers: [GdprController],
	providers: [GdprService],
})
export class GdprModule {}
