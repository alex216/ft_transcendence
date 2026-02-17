import {
	Injectable,
	NotFoundException,
	BadRequestException,
	ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FriendRequest } from "./friend-request.entity";
import { Friend } from "./friend.entity";
import { User } from "../user/user.entity";
import { ProfileService } from "../profile/profile.service";
import {
	FriendRequestStatus,
	GetFriendsResponse,
	GetFriendRequestsResponse,
	GetFriendStatusResponse,
} from "../../../shared/friend.types";

@Injectable()
export class FriendService {
	constructor(
		@InjectRepository(FriendRequest)
		private friendRequestRepository: Repository<FriendRequest>,
		@InjectRepository(Friend)
		private friendRepository: Repository<Friend>,
		@InjectRepository(User)
		private userRepository: Repository<User>,
		private profileService: ProfileService,
	) {}

	// フレンドリクエスト送信
	async sendFriendRequest(
		senderId: number,
		receiverIdOrUsername: number | string,
	): Promise<FriendRequest> {
		let receiverId: number;

		// receiverIdが数値の場合はそのまま使用、文字列の場合はusernameから検索
		if (typeof receiverIdOrUsername === "string") {
			const receiver = await this.userRepository.findOne({
				where: { username: receiverIdOrUsername },
			});
			if (!receiver) {
				throw new NotFoundException("ユーザーが見つかりません");
			}
			receiverId = receiver.id;
		} else {
			receiverId = receiverIdOrUsername;
		}

		// 自分自身にリクエストを送れないようにする
		if (senderId === receiverId) {
			throw new BadRequestException("自分自身にリクエストを送れません");
		}

		// 既にフレンドかチェック
		const existingFriend = await this.friendRepository.findOne({
			where: { userId: senderId, friendId: receiverId },
		});
		if (existingFriend) {
			throw new ConflictException("既にフレンドです");
		}

		// 既にリクエストが存在するかチェック
		const existingRequest = await this.friendRequestRepository.findOne({
			where: [
				{ senderId, receiverId, status: FriendRequestStatus.PENDING },
				{
					senderId: receiverId,
					receiverId: senderId,
					status: FriendRequestStatus.PENDING,
				},
			],
		});
		if (existingRequest) {
			throw new ConflictException("既にリクエストが存在します");
		}

		// リクエストを作成
		const friendRequest = this.friendRequestRepository.create({
			senderId,
			receiverId,
			status: FriendRequestStatus.PENDING,
		});

		return this.friendRequestRepository.save(friendRequest);
	}

	// フレンドリクエスト承認
	async acceptFriendRequest(requestId: number, userId: number): Promise<void> {
		const request = await this.friendRequestRepository.findOne({
			where: { id: requestId },
		});

		if (!request) {
			throw new NotFoundException("リクエストが見つかりません");
		}

		// 受信者のみが承認できる
		if (request.receiverId !== userId) {
			throw new BadRequestException("このリクエストを承認する権限がありません");
		}

		if (request.status !== FriendRequestStatus.PENDING) {
			throw new BadRequestException("このリクエストは既に処理されています");
		}

		// リクエストのステータスを更新
		request.status = FriendRequestStatus.ACCEPTED;
		await this.friendRequestRepository.save(request);

		// フレンド関係を双方向に作成
		const friend1 = this.friendRepository.create({
			userId: request.senderId,
			friendId: request.receiverId,
		});
		const friend2 = this.friendRepository.create({
			userId: request.receiverId,
			friendId: request.senderId,
		});

		await this.friendRepository.save([friend1, friend2]);
	}

	// フレンドリクエスト拒否
	async rejectFriendRequest(requestId: number, userId: number): Promise<void> {
		const request = await this.friendRequestRepository.findOne({
			where: { id: requestId },
		});

		if (!request) {
			throw new NotFoundException("リクエストが見つかりません");
		}

		// 受信者のみが拒否できる
		if (request.receiverId !== userId) {
			throw new BadRequestException("このリクエストを拒否する権限がありません");
		}

		if (request.status !== FriendRequestStatus.PENDING) {
			throw new BadRequestException("このリクエストは既に処理されています");
		}

		// リクエストのステータスを更新
		request.status = FriendRequestStatus.REJECTED;
		await this.friendRequestRepository.save(request);
	}

	// フレンド削除
	async removeFriend(userId: number, friendId: number): Promise<void> {
		// 双方向のフレンド関係を削除
		await this.friendRepository.delete({ userId, friendId });
		await this.friendRepository.delete({ userId: friendId, friendId: userId });
	}

	// フレンドリスト取得
	async getFriends(userId: number): Promise<GetFriendsResponse> {
		const friendRelations = await this.friendRepository.find({
			where: { userId },
		});

		const friends = await Promise.all(
			friendRelations.map(async (relation) => {
				const profile = await this.profileService.getProfileByUserId(
					relation.friendId,
				);
				return {
					id: relation.id,
					userId: relation.userId,
					friendId: relation.friendId,
					createdAt: relation.createdAt.toISOString(),
					friend: profile,
				};
			}),
		);

		return { friends };
	}

	// フレンドリクエスト一覧取得
	async getFriendRequests(userId: number): Promise<GetFriendRequestsResponse> {
		// 送信したリクエスト
		const sentRequests = await this.friendRequestRepository.find({
			where: { senderId: userId, status: FriendRequestStatus.PENDING },
		});

		// 受信したリクエスト
		const receivedRequests = await this.friendRequestRepository.find({
			where: { receiverId: userId, status: FriendRequestStatus.PENDING },
		});

		const sent = await Promise.all(
			sentRequests.map(async (request) => {
				const profile = await this.profileService.getProfileByUserId(
					request.receiverId,
				);
				return {
					id: request.id,
					receiverId: request.receiverId,
					status: request.status,
					createdAt: request.createdAt.toISOString(),
					receiver: profile,
				};
			}),
		);

		const received = await Promise.all(
			receivedRequests.map(async (request) => {
				const profile = await this.profileService.getProfileByUserId(
					request.senderId,
				);
				return {
					id: request.id,
					senderId: request.senderId,
					status: request.status,
					createdAt: request.createdAt.toISOString(),
					sender: profile,
				};
			}),
		);

		return { sent, received };
	}

	// 特定ユーザーとのフレンド状態を取得
	async getFriendStatus(
		userId: number,
		targetUserId: number,
	): Promise<GetFriendStatusResponse> {
		// フレンドかチェック
		const friend = await this.friendRepository.findOne({
			where: { userId, friendId: targetUserId },
		});

		if (friend) {
			return { isFriend: true };
		}

		// リクエストの存在チェック
		const request = await this.friendRequestRepository.findOne({
			where: [
				{
					senderId: userId,
					receiverId: targetUserId,
					status: FriendRequestStatus.PENDING,
				},
				{
					senderId: targetUserId,
					receiverId: userId,
					status: FriendRequestStatus.PENDING,
				},
			],
		});

		if (request) {
			return {
				isFriend: false,
				requestStatus: request.status,
				requestId: request.id,
				isSender: request.senderId === userId,
			};
		}

		return { isFriend: false };
	}
}
