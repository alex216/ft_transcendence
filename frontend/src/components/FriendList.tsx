import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getFriends, removeFriend, sendFriendRequest } from "../api";
import { translateMessage } from "../utils/translateMessage";
import type { GetFriendsResponse } from "/shared";

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

	const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

	useEffect(() => {
		loadFriends();
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
			<form onSubmit={handleSendRequest} className="add-friend-form">
				<input
					type="text"
					value={newFriendUsername}
					onChange={(e) => setNewFriendUsername(e.target.value)}
					placeholder={t("friends.usernamePlaceholder")}
					disabled={sending}
				/>
				<button type="submit" className="btn-primary" disabled={sending}>
					{sending ? t("friends.sending") : t("friends.sendRequest")}
				</button>
			</form>

			{message && <p className="message">{message}</p>}

			{/* フレンドリスト */}
			{friends.length === 0 ? (
				<p className="empty-state">{t("friends.noFriends")}</p>
			) : (
				<div className="friends-grid">
					{friends.map((friendItem) => (
						<div key={friendItem.id} className="friend-card">
							{friendItem.friend.avatarUrl ? (
								<img
									src={`${API_URL}${friendItem.friend.avatarUrl}`}
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
								<p className="username">@{friendItem.friend.username}</p>
								{friendItem.friend.bio && (
									<p className="bio">{friendItem.friend.bio}</p>
								)}
							</div>
							<div className="friend-actions">
								{onStartDM && (
									<button
										onClick={() =>
											onStartDM(friendItem.friendId, friendItem.friend.username)
										}
										className="btn-primary-small"
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
									className="btn-danger-small"
								>
									{t("friends.delete")}
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default FriendList;
