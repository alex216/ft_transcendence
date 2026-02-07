import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';

// メイン関数（プログラムのエントリーポイント）
// C++の int main() に相当
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS設定（フロントエンドからアクセスできるようにする）
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  app.enableCors({
    origin: frontendUrl, // フロントエンドのURL
    credentials: true, // クッキーを許可
  });

  // セッション設定
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'fallback-secret-key', // セッションの暗号化キー
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24時間
        httpOnly: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend is running on http://localhost:${port}`);
}

bootstrap();
