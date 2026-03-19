import {
	Controller,
	Get,
	Put,
	Post,
	Delete,
	Body,
	Param,
	UseGuards,
	Req,
	UseInterceptors,
	UploadedFile,
	BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { Request } from "express";
import { ProfileService } from "./profile.service";

interface AuthenticatedRequest extends Request {
	user: { id: number; username: string };
}
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
	UpdateProfileRequest,
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
	@UseGuards(JwtAuthGuard)
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
			throw new BadRequestException("無効なユーザーIDです");
		}

		return this.profileService.getProfileByUserId(userId);
	}

	// PUT /profile/me - プロフィール更新
	@Put("me")
	@UseGuards(JwtAuthGuard)
	async updateProfile(
		@Req() req: AuthenticatedRequest,
		@Body() updateData: UpdateProfileRequest,
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
	@UseGuards(JwtAuthGuard)
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
			fileFilter: (req, file, callback) => {
				if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
					return callback(
						new BadRequestException("画像ファイルのみアップロード可能です"),
						false,
					);
				}
				callback(null, true);
			},
			limits: { fileSize: 5 * 1024 * 1024 },
		}),
	)
	async uploadAvatar(
		@Req() req: AuthenticatedRequest,
		@UploadedFile() file: UploadedFileData,
	): Promise<UploadAvatarResponse> {
		const user = req.user;

		if (!file) {
			throw new BadRequestException("ファイルがアップロードされていません");
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
	@UseGuards(JwtAuthGuard)
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
