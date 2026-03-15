import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import { User } from "../user/user.entity";

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // 2FA設定用: シークレットキーとQRコードを生成する
  async generateSecret(user: User): Promise<{ qrCodeUrl: string }> {
    // 1. TOTPシークレットを生成
    const secret = speakeasy.generateSecret({
      name: `ft_transcendence (${user.username})`,
      length: 20,
    });

    // 2. シークレットをDBに保存（まだ有効化はしない）
    await this.userRepository.update(user.id, {
      two_factor_secret: secret.base32,
    });

    // 3. QRコードをBase64画像として生成してフロントに返す
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return { qrCodeUrl };
  }

  // 2FA有効化: ユーザーが入力した6桁コードを検証して有効化する
  async enableTwoFactor(user: User, token: string): Promise<boolean> {
    if (!user.two_factor_secret) return false;

    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token,
      window: 1, // 前後30秒の誤差を許容
    });

    if (isValid) {
      await this.userRepository.update(user.id, { is_2fa_enabled: true });
    }

    return isValid;
  }

  // 2FA無効化
  async disableTwoFactor(user: User): Promise<void> {
    await this.userRepository.update(user.id, {
      is_2fa_enabled: false,
      two_factor_secret: undefined,
    });
  }

  // ログイン時のコード検証
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });
  }
}
