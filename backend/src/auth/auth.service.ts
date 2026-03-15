import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { User } from "../user/user.entity";
import * as bcrypt from "bcrypt";

// 認証サービス
// C++で言うと「関数をまとめたクラス」のようなもの
@Injectable()
export class AuthService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		private jwtService: JwtService,
	) {}

	// JWTトークンを生成する（24時間有効）
	generateToken(user: User): string {
		const payload = { sub: user.id, username: user.username };
		return this.jwtService.sign(payload);
	}

	// 2FA用一時トークンを生成する（5分間有効・2FA未完了を示すフラグ付き）
	generateTempToken(user: User): string {
		const payload = {
			sub: user.id,
			username: user.username,
			twoFactorPending: true,
		};
		return this.jwtService.sign(payload, { expiresIn: "5m" });
	}

	// 一時トークンを検証してペイロードを返す
	verifyTempToken(token: string): { sub: number; username: string } | null {
		try {
			const payload = this.jwtService.verify(token) as {
				sub: number;
				username: string;
				twoFactorPending?: boolean;
			};
			if (!payload.twoFactorPending) return null;
			return payload;
		} catch {
			return null;
		}
	}

	// ユーザー登録
	async register(username: string, password: string): Promise<User> {
		// 既存ユーザーチェック
		const existingUser = await this.userRepository.findOne({
			where: { username },
		});

		if (existingUser) {
			throw new Error("ユーザー名は既に使用されています");
		}

		// --- 追加: パスワードのハッシュ化 ---
		// saltOrRounds: 10 は計算の複雑さを表します（ハッシュ化の強度）
		const hashedPassword = await bcrypt.hash(password, 10);

		const user = this.userRepository.create({
			username,
			password: hashedPassword, // ハッシュ化したパスワードを保存
		});

		return await this.userRepository.save(user);
	}

	// ログイン
	async login(username: string, password: string): Promise<User | null> {
		// ユーザー検索
		const user = await this.userRepository.findOne({
			where: { username },
		});

		// bcrypt.compare を使って「入力された平文」と「DBのハッシュ」を比較
		if (
			user &&
			user.password &&
			(await bcrypt.compare(password, user.password))
		) {
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

	/**
	 * 42 OAuth用のユーザー検証・作成ロジック
	 * マイルストーン6: Remote Authentication [cite: 653]
	 */
	async validateFortyTwoUser(details: {
		forty_two_id: string;
		username: string;
	}): Promise<User> {
		// 1. まず 42 ID でユーザーを検索する [cite: 204, 205]
		let user = await this.userRepository.findOne({
			where: { forty_two_id: details.forty_two_id },
		});

		// 2. ユーザーが存在しない場合は新規作成する
		if (!user) {
			console.log(`🆕 Creating new 42 OAuth user: ${details.username}`);

			// 42 OAuthユーザーはパスワードを持たないため password は省略
			user = this.userRepository.create({
				forty_two_id: details.forty_two_id,
				username: details.username,
				is_2fa_enabled: false, // 初期値は false [cite: 237]
			});

			await this.userRepository.save(user);
		}

		return user;
	}
}
