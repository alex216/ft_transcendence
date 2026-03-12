import {
	Controller,
	Get,
	Post,
	Delete,
	Body,
	Param,
	Session,
	UnauthorizedException,
	BadRequestException,
} from "@nestjs/common";
import { FriendService } from "./friend.service";
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

interface SessionData {
	userId?: number;
}

@Controller("friends")
export class FriendController {
	constructor(private friendService: FriendService) {}

	// POST /friends/request - フレンドリクエスト送信
	@Post("request")
	async sendFriendRequest(
		@Session() session: SessionData,
		@Body() body: SendFriendRequestRequest,
	): Promise<SendFriendRequestResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("errors.auth.loginRequired");
		}

		const receiverIdOrUsername = body.receiverId || body.username;
		if (!receiverIdOrUsername) {
			throw new BadRequestException("errors.friend.receiverRequired");
		}

		const request = await this.friendService.sendFriendRequest(
			session.userId,
			receiverIdOrUsername,
		);

		return {
			success: true,
			message: "success.friend.requestSent",
			friendRequest: {
				id: request.id,
				senderId: request.senderId,
				receiverId: request.receiverId,
				status: request.status,
				createdAt: request.createdAt.toISOString(),
			},
		};
	}

	// POST /friends/accept/:requestId - フレンドリクエスト承認
	@Post("accept/:requestId")
	async acceptFriendRequest(
		@Session() session: SessionData,
		@Param("requestId") requestId: string,
	): Promise<AcceptFriendRequestResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("errors.auth.loginRequired");
		}

		const id = parseInt(requestId, 10);
		if (isNaN(id)) {
			throw new BadRequestException("errors.friend.invalidRequestId");
		}

		await this.friendService.acceptFriendRequest(id, session.userId);

		return {
			success: true,
			message: "success.friend.requestAccepted",
		};
	}

	// POST /friends/reject/:requestId - フレンドリクエスト拒否
	@Post("reject/:requestId")
	async rejectFriendRequest(
		@Session() session: SessionData,
		@Param("requestId") requestId: string,
	): Promise<RejectFriendRequestResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("errors.auth.loginRequired");
		}

		const id = parseInt(requestId, 10);
		if (isNaN(id)) {
			throw new BadRequestException("errors.friend.invalidRequestId");
		}

		await this.friendService.rejectFriendRequest(id, session.userId);

		return {
			success: true,
			message: "success.friend.requestRejected",
		};
	}

	// DELETE /friends/:friendId - フレンド削除
	@Delete(":friendId")
	async removeFriend(
		@Session() session: SessionData,
		@Param("friendId") friendId: string,
	): Promise<RemoveFriendResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("errors.auth.loginRequired");
		}

		const id = parseInt(friendId, 10);
		if (isNaN(id)) {
			throw new BadRequestException("errors.friend.invalidUserId");
		}

		await this.friendService.removeFriend(session.userId, id);

		return {
			success: true,
			message: "success.friend.friendRemoved",
		};
	}

	// GET /friends - フレンドリスト取得
	@Get()
	async getFriends(
		@Session() session: SessionData,
	): Promise<GetFriendsResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("errors.auth.loginRequired");
		}

		return this.friendService.getFriends(session.userId);
	}

	// GET /friends/requests - フレンドリクエスト一覧取得
	@Get("requests")
	async getFriendRequests(
		@Session() session: SessionData,
	): Promise<GetFriendRequestsResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("errors.auth.loginRequired");
		}

		return this.friendService.getFriendRequests(session.userId);
	}

	// GET /friends/status/:userId - 特定ユーザーとのフレンド状態を取得
	@Get("status/:userId")
	async getFriendStatus(
		@Session() session: SessionData,
		@Param("userId") userId: string,
	): Promise<GetFriendStatusResponse> {
		if (!session.userId) {
			throw new UnauthorizedException("errors.auth.loginRequired");
		}

		const targetUserId = parseInt(userId, 10);
		if (isNaN(targetUserId)) {
			throw new BadRequestException("errors.friend.invalidUserId");
		}

		return this.friendService.getFriendStatus(session.userId, targetUserId);
	}
}
