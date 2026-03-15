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
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Public } from "./decorators/public.decorator";
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  GetMeResponse,
  LogoutResponse,
} from "../../../shared";

// JWTをCookieにセットするヘルパー関数
function setJwtCookie(res: Response, token: string) {
  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24時間
  });
}

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  // --- 42 OAuth 連携セクション ---

  @Public()
  @Get("42")
  @UseGuards(AuthGuard("42"))
  async fortyTwoAuth() {}

  @Public()
  @Get("42/callback")
  @UseGuards(AuthGuard("42"))
  async fortyTwoAuthRedirect(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    if (!user) {
      throw new HttpException("42認証に失敗しました", HttpStatus.UNAUTHORIZED);
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";

    // 2FAが有効なユーザーはコード入力画面へ
    if (user.is_2fa_enabled) {
      const tempToken = this.authService.generateTempToken(user);
      res.cookie("temp_token", tempToken, { httpOnly: true, sameSite: "lax", maxAge: 5 * 60 * 1000 });
      return res.redirect(`${frontendUrl}/2fa-verify`);
    }

    const token = this.authService.generateToken(user);
    setJwtCookie(res, token);
    console.log(`✅ User ${user.username} (ID: ${user.id}) logged in via 42 OAuth`);
    return res.redirect(`${frontendUrl}/home`);
  }

  // --- 通常のログイン・登録セクション ---

  @Public()
  @Post("register")
  async register(
    @Body() body: RegisterRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RegisterResponse> {
    try {
      const user = await this.authService.register(body.username, body.password);
      const token = this.authService.generateToken(user);
      setJwtCookie(res, token);
      return {
        success: true,
        message: "登録成功",
        user: { id: user.id, username: user.username },
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Public()
  @Post("login")
  async login(
    @Body() body: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const user = await this.authService.login(body.username, body.password);
    if (!user) {
      throw new HttpException(
        "ユーザー名またはパスワードが間違っています",
        HttpStatus.UNAUTHORIZED,
      );
    }

    // 2FAが有効なユーザーは一時トークンを発行してコード入力画面へ
    if (user.is_2fa_enabled) {
      const tempToken = this.authService.generateTempToken(user);
      res.cookie("temp_token", tempToken, { httpOnly: true, sameSite: "lax", maxAge: 5 * 60 * 1000 });
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
    @Body() body: { token: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tempToken = (req as any).cookies?.temp_token;
    if (!tempToken) {
      throw new HttpException("セッションが無効です。再度ログインしてください", HttpStatus.UNAUTHORIZED);
    }

    const payload = this.authService.verifyTempToken(tempToken);
    if (!payload) {
      throw new HttpException("セッションが期限切れです", HttpStatus.UNAUTHORIZED);
    }

    const user = await this.authService.findById(payload.sub);
    if (!user || !user.two_factor_secret) {
      throw new HttpException("ユーザーが見つかりません", HttpStatus.UNAUTHORIZED);
    }

    const isValid = this.twoFactorService.verifyToken(user.two_factor_secret, body.token);
    if (!isValid) {
      throw new HttpException("コードが正しくありません", HttpStatus.UNAUTHORIZED);
    }

    // 検証OK → 本物のJWTを発行
    res.clearCookie("temp_token");
    const accessToken = this.authService.generateToken(user);
    setJwtCookie(res, accessToken);

    return { success: true, message: "2FA認証成功" };
  }

  // POST /auth/2fa/setup - QRコードを生成して返す
  @Post("2fa/setup")
  async setupTwoFactor(@Req() req: Request) {
    const user = req.user as any;
    const fullUser = await this.authService.findById(user.id);
    if (!fullUser) throw new HttpException("ユーザーが見つかりません", HttpStatus.NOT_FOUND);

    return this.twoFactorService.generateSecret(fullUser);
  }

  // POST /auth/2fa/enable - コードを検証して2FAを有効化
  @Post("2fa/enable")
  async enableTwoFactor(
    @Req() req: Request,
    @Body() body: { token: string },
  ) {
    const user = req.user as any;
    const fullUser = await this.authService.findById(user.id);
    if (!fullUser) throw new HttpException("ユーザーが見つかりません", HttpStatus.NOT_FOUND);

    const success = await this.twoFactorService.enableTwoFactor(fullUser, body.token);
    if (!success) {
      throw new HttpException("コードが正しくありません", HttpStatus.BAD_REQUEST);
    }

    return { success: true, message: "2FAを有効化しました" };
  }

  // POST /auth/2fa/disable - 2FAを無効化
  @Post("2fa/disable")
  async disableTwoFactor(@Req() req: Request) {
    const user = req.user as any;
    const fullUser = await this.authService.findById(user.id);
    if (!fullUser) throw new HttpException("ユーザーが見つかりません", HttpStatus.NOT_FOUND);

    await this.twoFactorService.disableTwoFactor(fullUser);
    return { success: true, message: "2FAを無効化しました" };
  }

  // --- その他 ---

  @Get("me")
  async getCurrentUser(@Req() req: Request): Promise<GetMeResponse> {
    const user = req.user as any;
    return { id: user.id, username: user.username };
  }

  @Post("logout")
  async logout(@Res({ passthrough: true }) res: Response): Promise<LogoutResponse> {
    res.clearCookie("access_token");
    res.clearCookie("temp_token");
    return { success: true, message: "ログアウト成功" };
  }
}
