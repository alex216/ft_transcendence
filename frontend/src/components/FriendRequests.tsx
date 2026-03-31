import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
	getFriendRequests,
	acceptFriendRequest,
	rejectFriendRequest,
} from "../api";
import { translateMessage } from "../utils/translateMessage";
import type { GetFriendRequestsResponse } from "/shared";

const FriendRequests: React.FC = () => {
	const { t } = useTranslation();
	const [requests, setRequests] = useState<GetFriendRequestsResponse>({
		sent: [],
		received: [],
	});
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState("");
	const [processing, setProcessing] = useState<number | null>(null);

	// アバター画像はnginxの /uploads/ ルートから直接配信

	useEffect(() => {
		loadRequests();
	}, []);

	const loadRequests = async () => {
		try {
			const data = await getFriendRequests();
			setRequests(data);
		} catch {
			setMessage(t("friendRequests.loadFailed"));
		} finally {
			setLoading(false);
		}
	};

	const handleAccept = async (requestId: number) => {
		setProcessing(requestId);
		setMessage("");

		try {
			const response = await acceptFriendRequest(requestId);
			setMessage(translateMessage(response.message));
			// リストを再読み込み
			await loadRequests();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(
				translateMessage(error.response?.data?.message) ||
					t("friendRequests.acceptFailed"),
			);
		} finally {
			setProcessing(null);
		}
	};

	const handleReject = async (requestId: number) => {
		setProcessing(requestId);
		setMessage("");

		try {
			const response = await rejectFriendRequest(requestId);
			setMessage(translateMessage(response.message));
			// リストを再読み込み
			await loadRequests();
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(
				translateMessage(error.response?.data?.message) ||
					t("friendRequests.rejectFailed"),
			);
		} finally {
			setProcessing(null);
		}
	};

	if (loading) {
		return <div className="friend-requests">{t("friendRequests.loading")}</div>;
	}

	return (
		<div className="friend-requests">
			<h2>{t("friendRequests.title")}</h2>

			{message && <p className="message">{message}</p>}

			{/* 受信したリクエスト */}
			<section>
				<h3>
					{t("friendRequests.received")} ({requests.received.length})
				</h3>
				{requests.received.length === 0 ? (
					<p className="empty-state">{t("friendRequests.noRequests")}</p>
				) : (
					<div className="request-list">
						{requests.received.map((request) => (
							<div key={request.id} className="request-card">
								{request.sender.avatarUrl ? (
									<img
										src={request.sender.avatarUrl}
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
										{t("friendRequests.accept")}
									</button>
									<button
										onClick={() => handleReject(request.id)}
										className="btn-danger-small"
										disabled={processing === request.id}
									>
										{t("friendRequests.reject")}
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* 送信したリクエスト */}
			<section>
				<h3>
					{t("friendRequests.sent")} ({requests.sent.length})
				</h3>
				{requests.sent.length === 0 ? (
					<p className="empty-state">{t("friendRequests.noRequests")}</p>
				) : (
					<div className="request-list">
						{requests.sent.map((request) => (
							<div key={request.id} className="request-card">
								{request.receiver.avatarUrl ? (
									<img
										src={request.receiver.avatarUrl}
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
									<span className="status-badge">
										{t("friendRequests.sentStatus")}
									</span>
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
