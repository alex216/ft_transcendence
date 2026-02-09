import React, { useState, useEffect } from "react";
import {
	getFriendRequests,
	acceptFriendRequest,
	rejectFriendRequest,
} from "../api.ts";
import type { GetFriendRequestsResponse } from "/shared";

const FriendRequests: React.FC = () => {
	const [requests, setRequests] = useState<GetFriendRequestsResponse>({
		sent: [],
		received: [],
	});
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [processing, setProcessing] = useState<number | null>(null);

	const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

	useEffect(() => {
		loadRequests();
	}, []);

	const loadRequests = async () => {
		try {
			const data = await getFriendRequests();
			setRequests(data);
		} catch {
			setMessage("リクエストの読み込みに失敗しました");
		} finally {
			setLoading(false);
		}
	};

	const handleAccept = async (requestId: number) => {
		setProcessing(requestId);
		setMessage("");

		try {
			const response = await acceptFriendRequest(requestId);
			setMessage(response.message);
			// リストを再読み込み
			await loadRequests();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "承認に失敗しました");
		} finally {
			setProcessing(null);
		}
	};

	const handleReject = async (requestId: number) => {
		setProcessing(requestId);
		setMessage("");

		try {
			const response = await rejectFriendRequest(requestId);
			setMessage(response.message);
			// リストを再読み込み
			await loadRequests();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "拒否に失敗しました");
		} finally {
			setProcessing(null);
		}
	};

	if (loading) {
		return <div className="friend-requests">読み込み中...</div>;
	}

	return (
		<div className="friend-requests">
			<h2>フレンドリクエスト</h2>

			{message && <p className="message">{message}</p>}

			{/* 受信したリクエスト */}
			<section>
				<h3>受信したリクエスト ({requests.received.length})</h3>
				{requests.received.length === 0 ? (
					<p className="empty-state">リクエストはありません</p>
				) : (
					<div className="request-list">
						{requests.received.map((request) => (
							<div key={request.id} className="request-card">
								{request.sender.avatarUrl ? (
									<img
										src={`${API_URL}${request.sender.avatarUrl}`}
										alt={request.sender.username}
										className="avatar"
									/>
								) : (
									<div className="avatar-placeholder">
										{request.sender.username.charAt(0).toUpperCase()}
									</div>
								)}
								<div className="request-info">
									<h4>
										{request.sender.displayName || request.sender.username}
									</h4>
									<p className="username">@{request.sender.username}</p>
									{request.sender.bio && (
										<p className="bio">{request.sender.bio}</p>
									)}
								</div>
								<div className="request-actions">
									<button
										onClick={() => handleAccept(request.id)}
										className="btn-primary-small"
										disabled={processing === request.id}
									>
										承認
									</button>
									<button
										onClick={() => handleReject(request.id)}
										className="btn-danger-small"
										disabled={processing === request.id}
									>
										拒否
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* 送信したリクエスト */}
			<section>
				<h3>送信したリクエスト ({requests.sent.length})</h3>
				{requests.sent.length === 0 ? (
					<p className="empty-state">リクエストはありません</p>
				) : (
					<div className="request-list">
						{requests.sent.map((request) => (
							<div key={request.id} className="request-card">
								{request.receiver.avatarUrl ? (
									<img
										src={`${API_URL}${request.receiver.avatarUrl}`}
										alt={request.receiver.username}
										className="avatar"
									/>
								) : (
									<div className="avatar-placeholder">
										{request.receiver.username.charAt(0).toUpperCase()}
									</div>
								)}
								<div className="request-info">
									<h4>
										{request.receiver.displayName || request.receiver.username}
									</h4>
									<p className="username">@{request.receiver.username}</p>
									{request.receiver.bio && (
										<p className="bio">{request.receiver.bio}</p>
									)}
								</div>
								<div className="request-status">
									<span className="status-badge">送信済み</span>
								</div>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
};

export default FriendRequests;
