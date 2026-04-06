import {
	Controller,
	Post,
	Get,
	Body,
	HttpException,
	HttpStatus,
	UseGuards,
	Req,
	Res,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { TwoFactorService } from "./two-factor.service";
import { Public } from "./decorators/public.decorator";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyTwoFactorDto } from "./dto/verify-2fa.dto";
import { generateCsrfToken } from "../csrf/csrf.setup";
import { User } from "../user/user.entity";
import type {
	RegisterResponse,
	LoginResponse,
	GetMeResponse,
	LogoutResponse,
} from "../../../shared";

// 認証済みリクエストの型（req.user が存在することを保証）
interface AuthenticatedRequest extends Request {
	user: { id: number; username: string; is_2fa_enabled: boolean };
	cookies: Record<string, string>;
}

// 42 OAuthコールバック用（passport-42 が user を注入する）
interface FortyTwoCallbackRequest extends Request {
	user: User;
}

// JWTをCookieにセットするヘルパー関数
function setJwtCookie(res: Response, token: string) {
	const isSecure = process.env.NODE_ENV !== "development";
	const maxAge = 24 * 60 * 60 * 1000; // 24時間

	res.cookie("access_token", token, {
		httpOnly: true, // JS から読めない（XSS対策）
		sameSite: "strict", // 他サイトからのリクエストでは Cookie を送らない（CSRF対策）
		secure: isSecure, // 本番は HTTPS のみ
		maxAge,
	});

	// フロントエンドがログイン状態を判定するための補助cookie（httpOnly: false）
	res.cookie("logged_in", "true", {
		httpOnly: false,
		sameSite: "strict",
		secure: isSecure,
		maxAge,
	});
}

@Controller("auth")
export class AuthController {
	constructor(
		private authService: AuthService,
		private twoFactorService: TwoFactorService,
	) {}

	// --- CSRFトークン発行 ---

	@Public()
	@Get("csrf-token")
	getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const token = generateCsrfToken(
			req as Parameters<typeof generateCsrfToken>[0],
			res,
		);
		return { csrfToken: token };
	}

	// --- 42 OAuth 連携セクション ---

	@Public()
	@Get("42")
	@UseGuards(AuthGuard("42"))
	async fortyTwoAuth() {}

	@Public()
	@Get("42/callback")
	@UseGuards(AuthGuard("42"))
	async fortyTwoAuthRedirect(
		@Req() req: FortyTwoCallbackRequest,
		@Res() res: Response,
	) {
		const user = req.user;
		if (!user) {
			throw new HttpException("42認証に失敗しました", HttpStatus.UNAUTHORIZED);
		}

		const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

		// 2FAが有効なユーザーはコード入力画面へ
		if (user.is_2fa_enabled) {
			const tempToken = this.authService.generateTempToken(user);
			res.cookie("temp_token", tempToken, {
				httpOnly: true,
				sameSite: "strict",
				secure: process.env.NODE_ENV !== "development",
				maxAge: 5 * 60 * 1000,
			});
			return res.redirect(`${frontendUrl}/2fa-verify`);
		}

		const token = this.authService.generateToken(user);
		setJwtCookie(res, token);
		console.log(
			`✅ User ${user.username} (ID: ${user.id}) logged in via 42 OAuth`,
		);
		return res.redirect(`${frontendUrl}/home`);
	}

	// --- 通常のログイン・登録セクション ---

	@Public()
	@Post("register")
	async register(
		@Body() body: RegisterDto,
		@Res({ passthrough: true }) res: Response,
	): Promise<RegisterResponse> {
		try {
			const user = await this.authService.register(
				body.username,
				body.password,
			);
			const token = this.authService.generateToken(user);
			setJwtCookie(res, token);
			return {
				success: true,
				message: "登録成功",
				user: { id: user.id, username: user.username },
			};
		} catch (error) {
			return {
				success: false,
				message: (error as Error).message,
			};
		}
	}

	@Public()
	@Post("login")
	async login(
		@Body() body: LoginDto,
		@Res({ passthrough: true }) res: Response,
	): Promise<LoginResponse> {
		const user = await this.authService.login(body.username, body.password);
		if (!user) {
			return {
				success: false,
				message: "ユーザー名またはパスワードが間違っています",
			};
		}

		// 2FAが有効なユーザーは一時トークンを発行してコード入力画面へ
		if (user.is_2fa_enabled) {
			const tempToken = this.authService.generateTempToken(user);
			res.cookie("temp_token", tempToken, {
				httpOnly: true,
				sameSite: "strict",
				secure: process.env.NODE_ENV !== "development",
				maxAge: 5 * 60 * 1000,
			});
			return {
				success: true,
				message: "2FA_REQUIRED",
				user: { id: user.id, username: user.username },
			};
		}

		const token = this.authService.generateToken(user);
		setJwtCookie(res, token);
		return {
			success: true,
			message: "ログイン成功",
			user: { id: user.id, username: user.username },
		};
	}

	// --- 2FA セクション ---

	// POST /auth/2fa/verify - ログイン時のコード検証（一時トークンを使う）
	@Public()
	@Post("2fa/verify")
	async verifyTwoFactor(
		@Body() body: VerifyTwoFactorDto,
		@Req() req: AuthenticatedRequest,
		@Res({ passthrough: true }) res: Response,
	) {
		const tempToken = req.cookies?.temp_token;
		if (!tempToken) {
			return {
				success: false,
				message: "セッションが無効です。再度ログインしてください",
			};
		}

		const payload = this.authService.verifyTempToken(tempToken);
		if (!payload) {
			return { success: false, message: "セッションが期限切れです" };
		}

		const user = await this.authService.findById(payload.sub);
		if (!user || !user.two_factor_secret) {
			return { success: false, message: "ユーザーが見つかりません" };
		}

		const isValid = this.twoFactorService.verifyToken(
			user.two_factor_secret,
			body.token,
		);
		if (!isValid) {
			return { success: false, message: "コードが正しくありません" };
		}

		// 検証OK → 本物のJWTを発行
		res.clearCookie("temp_token");
		const accessToken = this.authService.generateToken(user);
		setJwtCookie(res, accessToken);

		return { success: true, message: "2FA認証成功" };
	}

	// POST /auth/2fa/setup - QRコードを生成して返す
	@Post("2fa/setup")
	async setupTwoFactor(@Req() req: AuthenticatedRequest) {
		const fullUser = await this.authService.findById(req.user.id);
		if (!fullUser)
			throw new HttpException("ユーザーが見つかりません", HttpStatus.NOT_FOUND);

		return this.twoFactorService.generateSecret(fullUser);
	}

	// POST /auth/2fa/enable - コードを検証して2FAを有効化
	@Post("2fa/enable")
	async enableTwoFactor(
		@Req() req: AuthenticatedRequest,
		@Body() body: VerifyTwoFactorDto,
	) {
		const fullUser = await this.authService.findById(req.user.id);
		if (!fullUser)
			throw new HttpException("ユーザーが見つかりません", HttpStatus.NOT_FOUND);

		const success = await this.twoFactorService.enableTwoFactor(
			fullUser,
			body.token,
		);
		if (!success) {
			return { success: false, message: "コードが正しくありません" };
		}

		return { success: true, message: "2FAを有効化しました" };
	}

	// POST /auth/2fa/disable - 2FAを無効化
	@Post("2fa/disable")
	async disableTwoFactor(@Req() req: AuthenticatedRequest) {
		const fullUser = await this.authService.findById(req.user.id);
		if (!fullUser)
			throw new HttpException("ユーザーが見つかりません", HttpStatus.NOT_FOUND);

		await this.twoFactorService.disableTwoFactor(fullUser);
		return { success: true, message: "2FAを無効化しました" };
	}

	// --- その他 ---

	@Get("me")
	async getCurrentUser(
		@Req() req: AuthenticatedRequest,
	): Promise<GetMeResponse> {
		return {
			id: req.user.id,
			username: req.user.username,
			is_2fa_enabled: req.user.is_2fa_enabled,
		};
	}

	@Post("logout")
	async logout(
		@Res({ passthrough: true }) res: Response,
	): Promise<LogoutResponse> {
		res.clearCookie("access_token");
		res.clearCookie("logged_in");
		res.clearCookie("temp_token");
		return { success: true, message: "ログアウト成功" };
	}
}
