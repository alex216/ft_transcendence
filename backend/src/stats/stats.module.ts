import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MatchHistory } from "../game/match-history.entity";
import { User } from "../user/user.entity";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
	imports: [TypeOrmModule.forFeature([MatchHistory, User])],
	controllers: [StatsController],
	providers: [StatsService],
})
export class StatsModule {}
