import {
	Controller,
	Post,
	Get,
	Body,
	Session,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type {
	RegisterRequest,
	RegisterResponse,
	LoginRequest,
	LoginResponse,
	GetMeResponse,
	LogoutResponse,
} from "/shared";

// セッションデータの型定義
interface SessionData {
	userId?: number;
}

// コントローラー = HTTPリクエストを受け取る部分
// C++で言うと「main関数」のような、エントリーポイント
@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	// POST /auth/register - ユーザー登録
	@Post("register")
	async register(@Body() body: RegisterRequest): Promise<RegisterResponse> {
		try {
			const user = await this.authService.register(
				body.username,
				body.password,
			);
			return {
				success: true,
				message: "登録成功",
				user: {
					id: user.id,
					username: user.username,
				},
			};
		} catch (error) {
			throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
		}
	}

	// POST /auth/login - ログイン
	@Post("login")
	async login(
		@Body() body: LoginRequest,
		@Session() session: SessionData, // セッション
	): Promise<LoginResponse> {
		const user = await this.authService.login(body.username, body.password);

		if (!user) {
			throw new HttpException(
				"ユーザー名またはパスワードが間違っています",
				HttpStatus.UNAUTHORIZED,
			);
		}

		// セッションにユーザーIDを保存
		// これで次回以降のリクエストでログイン状態が分かる
		session.userId = user.id;

		return {
			success: true,
			message: "ログイン成功",
			user: {
				id: user.id,
				username: user.username,
			},
		};
	}

	// GET /auth/me - 現在のログインユーザー情報取得
	@Get("me")
	async getCurrentUser(
		@Session() session: SessionData,
	): Promise<GetMeResponse> {
		if (!session.userId) {
			throw new HttpException("ログインしていません", HttpStatus.UNAUTHORIZED);
		}

		const user = await this.authService.findById(session.userId);

		if (!user) {
			throw new HttpException("ユーザーが見つかりません", HttpStatus.NOT_FOUND);
		}

		return {
			id: user.id,
			username: user.username,
		};
	}

	// POST /auth/logout - ログアウト
	@Post("logout")
	async logout(@Session() session: SessionData): Promise<LogoutResponse> {
		session.userId = undefined;
		return {
			success: true,
			message: "ログアウト成功",
		};
	}
}
