import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cycleLanguage, LANGUAGE_LABELS } from "./i18n";
import { register, login, getCurrentUser, logout } from "./api";
import { GetMeResponse } from "/shared";
import Profile from "./components/Profile";
import ProfileEdit from "./components/ProfileEdit";
import FriendList from "./components/FriendList";
import FriendRequests from "./components/FriendRequests";
import GamePage from "./components/GamePage";
import HistoryPage from "./components/HistoryPage";
import LeaderboardPage from "./components/LeaderboardPage";
import OnlinePage, { OnlineStartPayload } from "./components/OnlinePage";
import ChatPage from "./components/ChatPage";
import "./App.css";

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
	| "chat";

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

	// Game context（OnlinePage → GamePage 連携用）
	const [gameRoomId, setGameRoomId] = useState<string | null>(null);
	const [gameOpponent, setGameOpponent] = useState<
		OnlineStartPayload["opponent"] | null
	>(null);

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

	// 初回ロード時にログイン状態を確認（以前ログインしたことがある場合のみ）
	useEffect(() => {
		const hasLoggedInBefore = localStorage.getItem("hasLoggedIn") === "true";
		if (hasLoggedInBefore) {
			checkLoginStatus();
		}
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
			setMessage(t("auth.registerSuccess"));
			setIsLogin(true);
			setUsername("");
			setPassword("");
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || t("auth.registerFailed"));
		}
	};

	// ログイン処理
	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const data = await login(username, password);
			setUser(data.user);
			setMessage(t("auth.loginSuccess"));
			setUsername("");
			setPassword("");
			setCurrentPage("home");
			// ログイン成功時にフラグを保存（次回リロード時にログイン状態を確認するため）
			localStorage.setItem("hasLoggedIn", "true");
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || t("auth.loginFailed"));
		}
	};

	// ログアウト処理
	const handleLogout = async () => {
		try {
			await logout();
			setUser(null);
			setCurrentPage("home");
			setMessage(t("auth.logoutSuccess"));
			// ログアウト時にフラグを削除
			localStorage.removeItem("hasLoggedIn");
		} catch {
			setMessage(t("auth.logoutFailed"));
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
				return <Profile onEdit={() => setCurrentPage("profile-edit")} />;

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
						mode={gameMode}
						roomId={gameRoomId ?? undefined}
						opponent={gameOpponent}
						onBack={() =>
							setCurrentPage(gameMode === "online" ? "online" : "home")
						}
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
											setGameMode("ai");
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
							</ul>

							<div className="sidebar-footer">
								<button onClick={handleLogout} className="btn-logout">
									{t("nav.logout")}
								</button>
							</div>
						</nav>

						<main className="main-content">{renderContent()}</main>
					</>
				) : (
					<>
						{/* ログイン前：認証フォーム */}
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

								<form onSubmit={isLogin ? handleLogin : handleRegister}>
									<h2>
										{isLogin ? t("auth.login") : t("auth.userRegistration")}
									</h2>

									<input
										type="text"
										placeholder={t("auth.username")}
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										required
									/>

									<input
										type="password"
										placeholder={t("auth.password")}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
									/>

									<button type="submit">
										{isLogin ? t("auth.login") : t("auth.register")}
									</button>
								</form>

								{message && <p className="message">{message}</p>}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}

export default App;
