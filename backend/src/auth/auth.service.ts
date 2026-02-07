import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';

// 認証サービス
// C++で言うと「関数をまとめたクラス」のようなもの
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>, // データベース操作用
  ) {}

  // ユーザー登録
  async register(username: string, password: string): Promise<User> {
    // 既存ユーザーチェック
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new Error('ユーザー名は既に使用されています');
    }

    // 新規ユーザー作成（MVPなのでパスワードは平文）
    const user = this.userRepository.create({
      username,
      password, // 注意：本番環境では必ずハッシュ化すること！
    });

    return await this.userRepository.save(user);
  }

  // ログイン
  async login(username: string, password: string): Promise<User | null> {
    // ユーザー検索
    const user = await this.userRepository.findOne({
      where: { username },
    });

    // ユーザーが存在し、パスワードが一致するか確認
    if (user && user.password === password) {
      return user;
    }

    return null;
  }

  // IDでユーザー取得
  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
    });
  }
}
