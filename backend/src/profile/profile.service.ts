import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Profile } from "./profile.entity";
import { User } from "../user/user.entity";
import {
	GetProfileResponse,
	UpdateProfileRequest,
} from "../../../shared/profile.types";

@Injectable()
export class ProfileService {
	constructor(
		@InjectRepository(Profile)
		private profileRepository: Repository<Profile>,
		@InjectRepository(User)
		private userRepository: Repository<User>,
	) {}

	// プロフィール取得（ユーザーIDから）
	async getProfileByUserId(userId: number): Promise<GetProfileResponse> {
		// ユーザー情報を取得
		const user = await this.userRepository.findOne({ where: { id: userId } });
		if (!user) {
			throw new NotFoundException("ユーザーが見つかりません");
		}

		// プロフィール情報を取得（存在しない場合は自動作成）
		let profile = await this.profileRepository.findOne({
			where: { userId },
		});

		if (!profile) {
			// プロフィールが存在しない場合は作成
			profile = this.profileRepository.create({ userId });
			profile = await this.profileRepository.save(profile);
		}

		// レスポンスを構築
		return {
			id: user.id,
			username: user.username,
			displayName: profile.displayName,
			bio: profile.bio,
			avatarUrl: profile.avatarUrl,
			createdAt: profile.createdAt.toISOString(),
			updatedAt: profile.updatedAt.toISOString(),
		};
	}

	// プロフィール更新
	async updateProfile(
		userId: number,
		updateData: UpdateProfileRequest,
	): Promise<GetProfileResponse> {
		// プロフィールを取得または作成
		let profile = await this.profileRepository.findOne({
			where: { userId },
		});

		if (!profile) {
			profile = this.profileRepository.create({ userId });
		}

		// データを更新
		if (updateData.displayName !== undefined) {
			profile.displayName = updateData.displayName;
		}
		if (updateData.bio !== undefined) {
			profile.bio = updateData.bio;
		}

		// 保存
		profile = await this.profileRepository.save(profile);

		// 更新後のプロフィールを返す
		return this.getProfileByUserId(userId);
	}

	// アバターURL更新（ファイルアップロード後に呼ばれる）
	async updateAvatar(userId: number, avatarUrl: string): Promise<string> {
		let profile = await this.profileRepository.findOne({
			where: { userId },
		});

		if (!profile) {
			profile = this.profileRepository.create({ userId });
		}

		profile.avatarUrl = avatarUrl;
		await this.profileRepository.save(profile);

		return avatarUrl;
	}

	// アバター削除
	async deleteAvatar(userId: number): Promise<void> {
		const profile = await this.profileRepository.findOne({
			where: { userId },
		});

		if (profile && profile.avatarUrl) {
			profile.avatarUrl = null;
			await this.profileRepository.save(profile);
		}
	}
}
