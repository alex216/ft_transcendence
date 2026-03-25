import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cycleLanguage, LANGUAGE_LABELS } from "./i18n";
import {
	register,
	login,
	getCurrentUser,
	logout,
	FORTY_TWO_AUTH_URL,
} from "./api";
import type { GetMeResponse } from "/shared";
import TwoFAVerify from "./components/TwoFAVerify";
import Profile from "./components/Profile";
import ProfileEdit from "./components/ProfileEdit";
import FriendList from "./components/FriendList";
import FriendRequests from "./components/FriendRequests";
import GamePage from "./components/GamePage";
import HistoryPage from "./components/HistoryPage";
import LeaderboardPage from "./components/LeaderboardPage";
import OnlinePage, { OnlineStartPayload } from "./components/OnlinePage";
import ChatPage from "./components/ChatPage";
import LegalModal, { LegalType } from "./components/LegalModal";
import StatsDashboard from "./components/StatsDashboard";
import GdprSettings from "./components/GdprSettings";
import "./App.css";
import "./styles/responsive.css";

type Page =
	| "home"
	| "profile"
	| "profile-edit"
	| "friends"
	| "friend-requests"
	| "game"
	| "history"
	| "leaderboard"
	| "online"
	| "chat"
	| "stats"
	| "settings";

function App() {
	const { t, i18n } = useTranslation();

	// 状態管理
	const [user, setUser] = useState<GetMeResponse | null>(null);
	const [currentPage, setCurrentPage] = useState<Page>("home");

	// Auth UI
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");
	const [needs2FA, setNeeds2FA] = useState(false);

	// Game context（OnlinePage → GamePage 連携用）
	const [gameMode, setGameMode] = useState<"ai" | "online">("ai");
	const [gameRoomId, setGameRoomId] = useState<string | null>(null);
	const [gameOpponent, setGameOpponent] = useState<
		OnlineStartPayload["opponent"] | null
	>(null);

	// Legal modal
	const [legalModal, setLegalModal] = useState<LegalType | null>(null);

	// DM context（FriendList → ChatPage 連携用）
	const [dmTarget, setDmTarget] = useState<{
		odersId: number;
		username: string;
	} | null>(null);

	// DM開始ハンドラ
	const handleStartDM = (friendId: number, friendUsername: string) => {
		setDmTarget({ odersId: friendId, username: friendUsername });
		setCurrentPage("chat");
	};

	// 初回ロード時にログイン状態を確認（OAuthリダイレクト後もcookieからセッション復元）
	useEffect(() => {
		checkLoginStatus();
	}, []);

	// ログイン状態確認
	const checkLoginStatus = async () => {
		try {
			const userData = await getCurrentUser();
			setUser(userData);
		} catch {
			setUser(null);
		}
	};

	// 登録処理
	const handleRegister = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await register(username, password);
			setMessage("auth.registerSuccess");
			setIsLogin(true);
			setUsername("");
			setPassword("");
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "auth.registerFailed");
		}
	};

	// ログイン処理
	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const data = await login(username, password);
			if (data.message === "2FA_REQUIRED") {
				// 2FA有効ユーザー → コード入力画面へ
				setNeeds2FA(true);
				setUsername("");
				setPassword("");
				setMessage("");
			} else {
				// 通常ログイン成功
				setUser(data.user!);
				setMessage("auth.loginSuccess");
				setUsername("");
				setPassword("");
				setCurrentPage("home");
			}
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "auth.loginFailed");
		}
	};

	// 2FA認証成功ハンドラ
	const handle2FAVerified = (userData: GetMeResponse) => {
		setUser(userData);
		setNeeds2FA(false);
		setCurrentPage("home");
	};

	// ログアウト処理
	const handleLogout = async () => {
		try {
			await logout();
			setUser(null);
			setCurrentPage("home");
			setMessage("auth.logoutSuccess");
		} catch {
			setMessage("auth.logoutFailed");
		}
	};

	// ページコンテンツをレンダリング
	const renderContent = () => {
		// TypeScript の型絞り込みは関数の境界を越えられないため、null チェックが必要
		if (!user) return null;

		switch (currentPage) {
			case "home":
				return (
					<div className="home">
						<h2>{t("home.welcome", { username: user.username })}</h2>
						<p>
							{t("home.userId")}: {user.id}
						</p>
					</div>
				);

			case "profile":
				return (
					<Profile
						onEdit={() => setCurrentPage("profile-edit")}
						is2FAEnabled={user.is_2fa_enabled ?? false}
						onRefreshUser={checkLoginStatus}
					/>
				);

			case "profile-edit":
				return (
					<ProfileEdit
						onCancel={() => setCurrentPage("profile")}
						onSuccess={() => setCurrentPage("profile")}
					/>
				);

			case "friends":
				return <FriendList onStartDM={handleStartDM} />;

			case "friend-requests":
				return <FriendRequests />;

			case "game":
				// GamePage 側で props を受け取れるようにしておく（UI表示のため）
				return (
					<GamePage
						mode="ai"
						roomId={gameRoomId ?? undefined}
						opponent={gameOpponent}
						onBack={() => setCurrentPage("home")}
					/>
				);

			case "history":
				return <HistoryPage />;

			case "leaderboard":
				return <LeaderboardPage />;

			case "online":
				// gameRoomIdがある場合はゲーム画面を表示
				if (gameRoomId) {
					return (
						<GamePage
							mode="online"
							roomId={gameRoomId}
							opponent={gameOpponent}
							onBack={() => {
								setGameRoomId(null);
								setGameOpponent(null);
							}}
						/>
					);
				}
				// マッチング待機画面
				return (
					<OnlinePage
						onStart={({ roomId, opponent }) => {
							setGameRoomId(roomId);
							setGameOpponent(opponent);
						}}
					/>
				);

			case "chat":
				return (
					<ChatPage
						username={user.username}
						currentUserId={user.id}
						dmTarget={dmTarget}
						onClearDmTarget={() => setDmTarget(null)}
					/>
				);

			case "stats":
				return <StatsDashboard />;

			case "settings":
				return (
					<GdprSettings
						onAccountDeleted={() => {
							setUser(null);
							setCurrentPage("home");
							localStorage.removeItem("hasLoggedIn");
						}}
					/>
				);

			default:
				return null;
		}
	};

	// 統合コンテナ：ログイン前後で同じ要素を使用
	return (
		<div className="App">
			<div className={`unified-container ${user ? "logged-in" : "logged-out"}`}>
				{user ? (
					<>
						{/* ログイン後：サイドバー + メインコンテンツ */}
						<nav className="sidebar">
							<div className="sidebar-header">
								<h1>ft_transcendence</h1>
								<button className="lang-toggle" onClick={cycleLanguage}>
									{LANGUAGE_LABELS[i18n.language] || "EN"}
								</button>
							</div>
							<ul className="nav-menu">
								<li>
									<button
										className={currentPage === "home" ? "active" : ""}
										onClick={() => setCurrentPage("home")}
									>
										{t("nav.home")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "online" ? "active" : ""}
										onClick={() => {
											setGameRoomId(null);
											setGameOpponent(null);
											setCurrentPage("online");
										}}
									>
										{t("nav.online")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "game" ? "active" : ""}
										onClick={() => {
											setGameRoomId(null);
											setGameOpponent(null);
											setCurrentPage("game");
										}}
									>
										{t("nav.ai")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "history" ? "active" : ""}
										onClick={() => setCurrentPage("history")}
									>
										{t("nav.history")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "leaderboard" ? "active" : ""}
										onClick={() => setCurrentPage("leaderboard")}
									>
										{t("nav.leaderboard")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "chat" ? "active" : ""}
										onClick={() => setCurrentPage("chat")}
									>
										{t("nav.chat")}
									</button>
								</li>

								<li>
									<button
										className={
											currentPage.startsWith("profile") ? "active" : ""
										}
										onClick={() => setCurrentPage("profile")}
									>
										{t("nav.profile")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "friends" ? "active" : ""}
										onClick={() => setCurrentPage("friends")}
									>
										{t("nav.friends")}
									</button>
								</li>

								<li>
									<button
										className={
											currentPage === "friend-requests" ? "active" : ""
										}
										onClick={() => setCurrentPage("friend-requests")}
									>
										{t("nav.requests")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "stats" ? "active" : ""}
										onClick={() => setCurrentPage("stats")}
									>
										{t("nav.stats")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "settings" ? "active" : ""}
										onClick={() => setCurrentPage("settings")}
									>
										{t("nav.settings")}
									</button>
								</li>
							</ul>

							<div className="sidebar-footer">
								<button onClick={handleLogout} className="btn btn-danger w-100">
									{t("nav.logout")}
								</button>
							</div>
						</nav>

						<main className="main-content">
							<div className="main-content-inner">{renderContent()}</div>
							<footer className="app-footer">
								<span>{t("legal.footer.rights")}</span>
								<div className="app-footer-links">
									<button onClick={() => setLegalModal("privacy")}>
										{t("legal.footer.privacy")}
									</button>
									<button onClick={() => setLegalModal("terms")}>
										{t("legal.footer.terms")}
									</button>
								</div>
							</footer>
						</main>
					</>
				) : (
					<>
						{needs2FA ? (
							<TwoFAVerify
								onVerified={handle2FAVerified}
								onCancel={() => setNeeds2FA(false)}
							/>
						) : (
							<div className="auth-content">
								<div className="auth-header">
									<h1>ft_transcendence</h1>
									<button className="lang-toggle" onClick={cycleLanguage}>
										{LANGUAGE_LABELS[i18n.language] || "EN"}
									</button>
								</div>

								<div className="auth-form">
									<div className="tabs">
										<button
											className={isLogin ? "active" : ""}
											onClick={() => setIsLogin(true)}
										>
											{t("auth.login")}
										</button>
										<button
											className={!isLogin ? "active" : ""}
											onClick={() => setIsLogin(false)}
										>
											{t("auth.register")}
										</button>
									</div>

									<form
										onSubmit={isLogin ? handleLogin : handleRegister}
										className="d-flex flex-column gap-3"
									>
										<h2>
											{isLogin ? t("auth.login") : t("auth.userRegistration")}
										</h2>

										<input
											className="form-control"
											type="text"
											placeholder={t("auth.username")}
											value={username}
											onChange={(e) => setUsername(e.target.value)}
											required
										/>

										<input
											className="form-control"
											type="password"
											placeholder={t("auth.password")}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											required
										/>

										<button type="submit" className="btn btn-primary w-100">
											{isLogin ? t("auth.login") : t("auth.register")}
										</button>
									</form>

									{isLogin && (
										<div className="oauth-section">
											<div className="divider">
												<span>{t("auth.or")}</span>
											</div>
											<a href={FORTY_TWO_AUTH_URL} className="btn-42-login">
												{t("auth.loginWith42")}
											</a>
										</div>
									)}

									{message && <p className="message">{t(message)}</p>}
								</div>
							</div>
						)}
						<footer className="app-footer">
							<span>{t("legal.footer.rights")}</span>
							<div className="app-footer-links">
								<button onClick={() => setLegalModal("privacy")}>
									{t("legal.footer.privacy")}
								</button>
								<button onClick={() => setLegalModal("terms")}>
									{t("legal.footer.terms")}
								</button>
							</div>
						</footer>
					</>
				)}
			</div>
			{legalModal && (
				<LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
			)}
		</div>
	);
}

export default App;
