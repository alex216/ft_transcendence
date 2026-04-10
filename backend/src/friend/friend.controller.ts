import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Param,
	Req,
} from "@nestjs/common";
import { Request } from "express";
import { FriendService } from "./friend.service";

interface AuthenticatedRequest extends Request {
	user: { id: number; username: string };
}
import {
	SendFriendRequestRequest,
	SendFriendRequestResponse,
	AcceptFriendRequestResponse,
	RejectFriendRequestResponse,
	RemoveFriendResponse,
	GetFriendsResponse,
	GetFriendRequestsResponse,
	GetFriendStatusResponse,
} from "../../../shared/friend.types";

@Controller("friends")
export class FriendController {
	constructor(private friendService: FriendService) {}

	// POST /friends/request - フレンドリクエスト送信
	@Post("request")
	async sendFriendRequest(
		@Req() req: AuthenticatedRequest,
		@Body() body: SendFriendRequestRequest,
	): Promise<SendFriendRequestResponse> {
		const user = req.user;

		const receiverIdOrUsername = body.receiverId || body.username;
		if (!receiverIdOrUsername) {
			return {
				success: false,
				message: "receiverId または username が必要です",
			};
		}

		try {
			const request = await this.friendService.sendFriendRequest(
				user.id,
				receiverIdOrUsername,
			);
			return {
				success: true,
				message: "フレンドリクエストを送信しました",
				friendRequest: {
					id: request.id,
					senderId: request.senderId,
					receiverId: request.receiverId,
					status: request.status,
					createdAt: request.createdAt.toISOString(),
				},
			};
		} catch (error) {
			return { success: false, message: (error as Error).message };
		}
	}

	// POST /friends/accept/:requestId - フレンドリクエスト承認
	@Post("accept/:requestId")
	async acceptFriendRequest(
		@Req() req: AuthenticatedRequest,
		@Param("requestId") requestId: string,
	): Promise<AcceptFriendRequestResponse> {
		const user = req.user;

		const id = parseInt(requestId, 10);
		if (isNaN(id)) {
			return { success: false, message: "無効なリクエストIDです" };
		}

		try {
			await this.friendService.acceptFriendRequest(id, user.id);
			return { success: true, message: "フレンドリクエストを承認しました" };
		} catch (error) {
			return { success: false, message: (error as Error).message };
		}
	}

	// POST /friends/reject/:requestId - フレンドリクエスト拒否
	@Post("reject/:requestId")
	async rejectFriendRequest(
		@Req() req: AuthenticatedRequest,
		@Param("requestId") requestId: string,
	): Promise<RejectFriendRequestResponse> {
		const user = req.user;

		const id = parseInt(requestId, 10);
		if (isNaN(id)) {
			return { success: false, message: "無効なリクエストIDです" };
		}

		try {
			await this.friendService.rejectFriendRequest(id, user.id);
			return { success: true, message: "フレンドリクエストを拒否しました" };
		} catch (error) {
			return { success: false, message: (error as Error).message };
		}
	}

	// DELETE /friends/:friendId - フレンド削除
	@Delete(":friendId")
	async removeFriend(
		@Req() req: AuthenticatedRequest,
		@Param("friendId") friendId: string,
	): Promise<RemoveFriendResponse> {
		const user = req.user;

		const id = parseInt(friendId, 10);
		if (isNaN(id)) {
			return { success: false, message: "無効なユーザーIDです" };
		}

		try {
			await this.friendService.removeFriend(user.id, id);
			return { success: true, message: "フレンドを削除しました" };
		} catch (error) {
			return { success: false, message: (error as Error).message };
		}
	}

	// GET /friends - フレンドリスト取得
	@Get()
	async getFriends(
		@Req() req: AuthenticatedRequest,
	): Promise<GetFriendsResponse> {
		const user = req.user;
		return this.friendService.getFriends(user.id);
	}

	// GET /friends/requests - フレンドリクエスト一覧取得
	@Get("requests")
	async getFriendRequests(
		@Req() req: AuthenticatedRequest,
	): Promise<GetFriendRequestsResponse> {
		const user = req.user;
		return this.friendService.getFriendRequests(user.id);
	}

	// GET /friends/status/:userId - 特定ユーザーとのフレンド状態を取得
	@Get("status/:userId")
	async getFriendStatus(
		@Req() req: AuthenticatedRequest,
		@Param("userId") userId: string,
	): Promise<GetFriendStatusResponse> {
		const user = req.user;

		const targetUserId = parseInt(userId, 10);
		if (isNaN(targetUserId)) {
			return { isFriend: false };
		}

		return this.friendService.getFriendStatus(user.id, targetUserId);
	}
}
