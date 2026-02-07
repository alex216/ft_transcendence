import React, { useState, useEffect } from "react";
import { getFriends, removeFriend, sendFriendRequest } from "../api.ts";
import type { GetFriendsResponse } from "/shared";

const FriendList: React.FC = () => {
	const [friends, setFriends] = useState<GetFriendsResponse["friends"]>([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [newFriendUsername, setNewFriendUsername] = useState("");
	const [sending, setSending] = useState(false);

	const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

	useEffect(() => {
		loadFriends();
	}, []);

	const loadFriends = async () => {
		try {
			const data = await getFriends();
			setFriends(data.friends);
		} catch {
			setMessage("フレンドリストの読み込みに失敗しました");
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
			setMessage(response.message);
			setNewFriendUsername("");
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(
				error.response?.data?.message || "リクエスト送信に失敗しました",
			);
		} finally {
			setSending(false);
		}
	};

	const handleRemoveFriend = async (friendId: number, username: string) => {
		if (!window.confirm(`${username}をフレンドから削除しますか？`)) return;

		try {
			const response = await removeFriend(friendId);
			setMessage(response.message);
			// リストを再読み込み
			await loadFriends();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "削除に失敗しました");
		}
	};

	if (loading) {
		return <div className="friend-list">読み込み中...</div>;
	}

	return (
		<div className="friend-list">
			<h2>フレンド ({friends.length})</h2>

			{/* フレンド追加フォーム */}
			<form onSubmit={handleSendRequest} className="add-friend-form">
				<input
					type="text"
					value={newFriendUsername}
					onChange={(e) => setNewFriendUsername(e.target.value)}
					placeholder="ユーザー名を入力"
					disabled={sending}
				/>
				<button type="submit" className="btn-primary" disabled={sending}>
					{sending ? "送信中..." : "リクエスト送信"}
				</button>
			</form>

			{message && <p className="message">{message}</p>}

			{/* フレンドリスト */}
			{friends.length === 0 ? (
				<p className="empty-state">まだフレンドがいません</p>
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
							<button
								onClick={() =>
									handleRemoveFriend(
										friendItem.friendId,
										friendItem.friend.username,
									)
								}
								className="btn-danger-small"
							>
								削除
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default FriendList;
