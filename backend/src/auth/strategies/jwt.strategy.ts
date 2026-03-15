import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';

// JWTペイロードの型定義（トークンに入っているデータの形）
interface JwtPayload {
  sub: number;       // ユーザーID（subject）
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET環境変数が設定されていません');
    }
    super({
      // リクエストのCookieから "access_token" という名前のJWTを取り出す
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.access_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // JWTの検証が成功した後に呼ばれる。戻り値が req.user に入る
  async validate(payload: JwtPayload) {
    const user = await this.authService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('ユーザーが見つかりません');
    }
    return user;
  }
}
