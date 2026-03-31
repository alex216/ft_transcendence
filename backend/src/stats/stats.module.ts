import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MatchHistory } from "../game/match-history.entity";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

@Module({
	imports: [TypeOrmModule.forFeature([MatchHistory])],
	controllers: [StatsController],
	providers: [StatsService],
})
export class StatsModule {}
