import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getFriends, removeFriend, sendFriendRequest } from "../api";
import { translateMessage } from "../utils/translateMessage";
import {
	onUserStatusChanged,
	offUserStatusChanged,
} from "../services/chatSocket";
import type { GetFriendsResponse } from "/shared";
import type { UserStatusChangedEvent } from "/shared/chat.interface";
import UserProfileModal from "./UserProfileModal";

type FriendListProps = {
	onStartDM?: (friendId: number, friendUsername: string) => void;
};

const FriendList: React.FC<FriendListProps> = ({ onStartDM }) => {
	const { t } = useTranslation();
	const [friends, setFriends] = useState<GetFriendsResponse["friends"]>([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [newFriendUsername, setNewFriendUsername] = useState("");
	const [sending, setSending] = useState(false);
	const [viewingUserId, setViewingUserId] = useState<number | null>(null);

	// アバター画像はnginxの /uploads/ ルートから直接配信

	useEffect(() => {
		loadFriends();

		// WebSocket経由でフレンドの online/offline 変化をリアルタイム反映
		const handleStatusChange = (payload: UserStatusChangedEvent) => {
			setFriends((prev) =>
				prev.map((f) =>
					f.friendId === payload.userId
						? { ...f, isOnline: payload.isOnline }
						: f,
				),
			);
		};
		onUserStatusChanged(handleStatusChange);
		return () => {
			offUserStatusChanged(handleStatusChange);
		};
	}, []);

	const loadFriends = async () => {
		try {
			const data = await getFriends();
			setFriends(data.friends);
		} catch {
			setMessage(t("friends.loadFailed"));
		} finally {
			setLoading(false);
		}
	};

	const handleSendRequest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newFriendUsername.trim()) return;

		setSending(true);
		setMessage("");

		try {
			const response = await sendFriendRequest({
				username: newFriendUsername.trim(),
			});
			if (!response.success) {
				setMessage(translateMessage(response.message));
				return;
			}
			setMessage(translateMessage(response.message));
			setNewFriendUsername("");
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(
				translateMessage(error.response?.data?.message) ||
					t("friends.sendFailed"),
			);
		} finally {
			setSending(false);
		}
	};

	const handleRemoveFriend = async (friendId: number, username: string) => {
		if (!window.confirm(t("friends.deleteConfirm", { username }))) return;

		try {
			const response = await removeFriend(friendId);
			if (!response.success) {
				setMessage(translateMessage(response.message));
				return;
			}
			setMessage(translateMessage(response.message));
			// リストを再読み込み
			await loadFriends();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(
				translateMessage(error.response?.data?.message) ||
					t("friends.deleteFailed"),
			);
		}
	};

	if (loading) {
		return <div className="friend-list">{t("friends.loading")}</div>;
	}

	return (
		<div className="friend-list">
			<h2>
				{t("friends.title")} ({friends.length})
			</h2>

			{/* フレンド追加フォーム */}
			<form
				onSubmit={handleSendRequest}
				className="d-flex gap-3 mb-5 p-4 bg-white rounded-3 shadow-sm"
			>
				<input
					className="form-control"
					type="text"
					value={newFriendUsername}
					onChange={(e) => setNewFriendUsername(e.target.value)}
					placeholder={t("friends.usernamePlaceholder")}
					disabled={sending}
				/>
				<button type="submit" className="btn btn-primary" disabled={sending}>
					{sending ? t("friends.sending") : t("friends.sendRequest")}
				</button>
			</form>

			{message && <p className="message">{message}</p>}

			{/* フレンドリスト */}
			{friends.length === 0 ? (
				<p className="text-center text-muted p-5 bg-white rounded-3">
					{t("friends.noFriends")}
				</p>
			) : (
				<div className="friends-grid">
					{friends.map((friendItem) => (
						<div
							key={friendItem.id}
							className="bg-white p-4 rounded-3 shadow-sm d-flex flex-column align-items-center gap-3"
						>
							{friendItem.friend.avatarUrl ? (
								<img
									src={friendItem.friend.avatarUrl}
									alt={friendItem.friend.username}
									className="avatar"
								/>
							) : (
								<div className="avatar-placeholder">
									{friendItem.friend.username.charAt(0).toUpperCase()}
								</div>
							)}
							<div className="friend-info">
								<h3>
									{friendItem.friend.displayName || friendItem.friend.username}
								</h3>
								<span
									className={`badge ${friendItem.isOnline ? "bg-success" : "bg-secondary"}`}
								>
									{t(
										friendItem.isOnline ? "friends.online" : "friends.offline",
									)}
								</span>
								<p className="username">@{friendItem.friend.username}</p>
								{friendItem.friend.bio && (
									<p className="bio">{friendItem.friend.bio}</p>
								)}
							</div>
							<div className="d-flex gap-2 flex-wrap justify-content-center">
								<button
									onClick={() => setViewingUserId(friendItem.friendId)}
									className="btn btn-outline-secondary btn-sm"
								>
									{t("friends.viewProfile")}
								</button>
								{onStartDM && (
									<button
										onClick={() =>
											onStartDM(friendItem.friendId, friendItem.friend.username)
										}
										className="btn btn-primary btn-sm"
									>
										{t("friends.dm")}
									</button>
								)}
								<button
									onClick={() =>
										handleRemoveFriend(
											friendItem.friendId,
											friendItem.friend.username,
										)
									}
									className="btn btn-danger btn-sm"
								>
									{t("friends.delete")}
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{viewingUserId !== null && (
				<UserProfileModal
					userId={viewingUserId}
					onClose={() => setViewingUserId(null)}
				/>
			)}
		</div>
	);
};

export default FriendList;
