import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TwoFactorService } from "./two-factor.service";
import { User } from "../user/user.entity";
import { Friend } from "../friend/friend.entity";
import { FortyTwoStrategy } from "./strategies/forty-two.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { UserModule } from "../user/user.module";
import { ChatModule } from "../chat/chat.module";

@Module({
	imports: [
		TypeOrmModule.forFeature([User, Friend]),
		PassportModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET || "fallback-jwt-secret",
			signOptions: { expiresIn: "24h" },
		}),
		UserModule, // UserStatusService をログイン/ログアウトで使うため
		ChatModule, // ChatGateway.emitToUsers でプレゼンス通知を送るため
	],
	controllers: [AuthController],
	providers: [AuthService, TwoFactorService, FortyTwoStrategy, JwtStrategy],
	exports: [AuthService],
})
export class AuthModule {}
