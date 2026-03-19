import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity'; // パスは適宜合わせてください

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // アプリ起動時に自動で実行される
  async onModuleInit() {
    console.log('Checking SKIP_AUTH in UserService:', process.env.SKIP_AUTH); // ★これが出るか確認
    if (process.env.SKIP_AUTH === 'true') {
      await this.createTestUserIfNotExists();
    }
  }

  private async createTestUserIfNotExists() {
    const testUserId = 1;
    const user = await this.userRepository.findOne({ where: { id: testUserId } });

    if (!user) {
      console.log('🌱 SKIP_AUTH=true: Creating test user (ID: 1)...');
      const newUser = this.userRepository.create({
        id: testUserId,
        username: 'test_user',
        is_2fa_enabled: false,
        // パスワードは後で nullable: true に修正する前提
      });
      await this.userRepository.save(newUser);
    }
  }
}