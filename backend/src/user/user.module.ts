import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';

@Module({
  imports: [
    // TypeORMでUserエンティティをこのモジュール内で使えるようにする
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UserService],
  exports: [UserService], // 他のモジュール（Authなど）でUserServiceを使いたい場合に必要
})
export class UserModule {}