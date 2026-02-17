import {
	Controller,
	Get,
	Put,
	Post,
	Delete,
	Body,
	Param,
	Session,
	UnauthorizedException,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { ProfileService } from "./profile.service";
import {
	UpdateProfileRequest,
	UpdateProfileResponse,
	GetProfileResponse,
	UploadAvatarResponse,
	DeleteAvatarResponse,
} from "../../../shared/profile.types";

interface SessionData {
	userId?: number;
}

interface UploadedFileData {
	filename: string;
	originalname: string;
	mimetype: string;
}

interface RequestWithSession {
	session?: SessionData;
}

@Controller("profile")
export class ProfileController {
	constructor(private profileService: ProfileService) {}

	// GET /profile/me - 自分のプロフィール取得
	@Get("me")
	async getMyProfile(
		@Session() session: SessionData,
	): Promise<GetProfileResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("ログインが必要です");
		}

		return this.profileService.getProfileByUserId(session.userId);
	}

	// GET /profile/:id - 他のユーザーのプロフィール取得
	@Get(":id")
	async getProfile(@Param("id") id: string): Promise<GetProfileResponse> {
		const userId = parseInt(id, 10);
		if (isNaN(userId)) {
			throw new BadRequestException("無効なユーザーIDです");
		}

		return this.profileService.getProfileByUserId(userId);
	}

	// PUT /profile/me - プロフィール更新
	@Put("me")
	async updateProfile(
		@Session() session: SessionData,
		@Body() updateData: UpdateProfileRequest,
	): Promise<UpdateProfileResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("ログインが必要です");
		}

		const profile = await this.profileService.updateProfile(
			session.userId,
			updateData,
		);

		return {
			success: true,
			message: "プロフィールを更新しました",
			profile,
		};
	}

	// POST /profile/avatar - アバターアップロード
	@Post("avatar")
	@UseInterceptors(
		FileInterceptor("avatar", {
			storage: diskStorage({
				destination: "./uploads/avatars",
				filename: (req, file, callback) => {
					// ファイル名: user-{userId}-{timestamp}.{拡張子}
					const session = (req as RequestWithSession).session;
					const userId = session?.userId || "unknown";
					const timestamp = Date.now();
					const ext = extname(file.originalname);
					const filename = `user-${userId}-${timestamp}${ext}`;
					callback(null, filename);
				},
			}),
			fileFilter: (req, file, callback) => {
				// 画像ファイルのみ許可
				if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
					return callback(
						new BadRequestException("画像ファイルのみアップロード可能です"),
						false,
					);
				}
				callback(null, true);
			},
			limits: {
				fileSize: 5 * 1024 * 1024, // 5MB制限
			},
		}),
	)
	async uploadAvatar(
		@Session() session: SessionData,
		@UploadedFile() file: UploadedFileData,
	): Promise<UploadAvatarResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("ログインが必要です");
		}

		if (!file) {
			throw new BadRequestException("ファイルがアップロードされていません");
		}

		// ファイルパスをDBに保存（フロントエンドからアクセス可能なURL形式）
		const avatarUrl = `/uploads/avatars/${file.filename}`;
		await this.profileService.updateAvatar(session.userId, avatarUrl);

		return {
			success: true,
			message: "アバターをアップロードしました",
			avatarUrl,
		};
	}

	// DELETE /profile/avatar - アバター削除
	@Delete("avatar")
	async deleteAvatar(
		@Session() session: SessionData,
	): Promise<DeleteAvatarResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("ログインが必要です");
		}

		await this.profileService.deleteAvatar(session.userId);

		return {
			success: true,
			message: "アバターを削除しました",
		};
	}
}
