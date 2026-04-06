import {
	Controller,
	Get,
	Put,
	Post,
	Delete,
	Body,
	Param,
	Req,
	UseInterceptors,
	UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { unlink } from "fs";
import { Request } from "express";
import { ProfileService } from "./profile.service";

interface AuthenticatedRequest extends Request {
	user: { id: number; username: string };
}
import { UpdateProfileDto } from "./dto/update-profile.dto";
import {
	UpdateProfileResponse,
	GetProfileResponse,
	UploadAvatarResponse,
	DeleteAvatarResponse,
} from "../../../shared/profile.types";

interface UploadedFileData {
	filename: string;
	originalname: string;
	mimetype: string;
}

@Controller("profile")
export class ProfileController {
	constructor(private profileService: ProfileService) {}

	// GET /profile/me - 自分のプロフィール取得
	@Get("me")
	async getMyProfile(
		@Req() req: AuthenticatedRequest,
	): Promise<GetProfileResponse> {
		const user = req.user;
		return this.profileService.getProfileByUserId(user.id);
	}

	// GET /profile/:id - 他のユーザーのプロフィール取得
	@Get(":id")
	async getProfile(@Param("id") id: string): Promise<GetProfileResponse> {
		const userId = parseInt(id, 10);
		if (isNaN(userId)) {
			throw new Error("無効なユーザーIDです");
		}

		return this.profileService.getProfileByUserId(userId);
	}

	// PUT /profile/me - プロフィール更新
	@Put("me")
	async updateProfile(
		@Req() req: AuthenticatedRequest,
		@Body() updateData: UpdateProfileDto,
	): Promise<UpdateProfileResponse> {
		const user = req.user;
		const profile = await this.profileService.updateProfile(
			user.id,
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
					const user = req.user as { id: number } | undefined;
					const userId = user?.id || "unknown";
					const timestamp = Date.now();
					const ext = extname(file.originalname);
					callback(null, `user-${userId}-${timestamp}${ext}`);
				},
			}),
			limits: { fileSize: 5 * 1024 * 1024 },
		}),
	)
	async uploadAvatar(
		@Req() req: AuthenticatedRequest,
		@UploadedFile() file: UploadedFileData,
	): Promise<UploadAvatarResponse> {
		const user = req.user;

		if (!file) {
			return {
				success: false,
				message: "ファイルがアップロードされていません",
			};
		}

		// ファイル形式チェック（multer保存後にコントローラ内で検証）
		if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
			// 不正なファイルを削除してからエラーを返す
			unlink(`./uploads/avatars/${file.filename}`, () => {});
			return {
				success: false,
				message: "画像ファイルのみアップロード可能です",
			};
		}

		const avatarUrl = `/uploads/avatars/${file.filename}`;
		await this.profileService.updateAvatar(user.id, avatarUrl);

		return {
			success: true,
			message: "アバターをアップロードしました",
			avatarUrl,
		};
	}

	// DELETE /profile/avatar - アバター削除
	@Delete("avatar")
	async deleteAvatar(
		@Req() req: AuthenticatedRequest,
	): Promise<DeleteAvatarResponse> {
		const user = req.user;
		await this.profileService.deleteAvatar(user.id);

		return {
			success: true,
			message: "アバターを削除しました",
		};
	}
}
