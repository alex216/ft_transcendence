import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
const { Strategy } = require('passport-42');
import { AuthService } from '../auth.service';

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.FORTY_TWO_CLIENT_ID,
      clientSecret: process.env.FORTY_TWO_CLIENT_SECRET,
      callbackURL: process.env.FORTY_TWO_CALLBACK_URL,
    });
  }

  // 42の認証が成功した後に呼ばれるメソッド
  async validate(accessToken: string, refreshToken: string, profile: any): Promise<any> {
    const { id, username, emails } = profile;

    console.log('--- 42 API Profile Received ---');
    console.log('ID:', profile.id);
    console.log('Username:', profile.username);
    
    // 42の情報を元に、DB内のユーザーを探す、または新規作成するロジックを呼び出す
    const user = await this.authService.validateFortyTwoUser({
      forty_two_id: id,
      username: username,
    });
    
    return user;
  }
}