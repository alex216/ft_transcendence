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
import ConfirmDialog from "./components/ConfirmDialog";
import { surrender } from "./services/gameSocket";
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
	const [gameRoomId, setGameRoomId] = useState<string | null>(null);
	const [gameOpponent, setGameOpponent] = useState<
		OnlineStartPayload["opponent"] | null
	>(null);

	// Legal modal
	const [legalModal, setLegalModal] = useState<LegalType | null>(null);

	// Mobile menu
	const [menuOpen, setMenuOpen] = useState(false);

	// AIモード再マウント用キー
	const [aiGameKey, setAiGameKey] = useState(() => Date.now());

	// ゲーム中のモード切り替え確認
	const [pendingNavigation, setPendingNavigation] = useState<Page | null>(null);

	const navigateTo = (page: Page) => {
		setCurrentPage(page);
		setMenuOpen(false);
	};

	// ゲーム画面にいるかどうか（SSOT: 既存ステートから導出）
	const isInGamePage =
		currentPage === "game" || (currentPage === "online" && gameRoomId !== null);

	// ゲーム中なら確認ポップアップ、そうでなければ即遷移
	const handleNavigation = (target: Page, resetGame = false) => {
		if (isInGamePage && target !== currentPage) {
			setPendingNavigation(target);
			return;
		}
		if (resetGame) {
			setGameRoomId(null);
			setGameOpponent(null);
		}
		navigateTo(target);
	};

	// ポップアップ承諾: surrender → 遷移（同一ソケットを再利用し順序保証）
	const handleConfirmLeave = () => {
		surrender();
		setGameRoomId(null);
		setGameOpponent(null);
		if (pendingNavigation) navigateTo(pendingNavigation);
		setPendingNavigation(null);
	};

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

	// ログイン状態確認（logged_in cookieがない場合はAPIコールをスキップ）
	const checkLoginStatus = async () => {
		if (!document.cookie.includes("logged_in")) {
			setUser(null);
			return;
		}
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
			const data = await register(username, password);
			if (!data.success) {
				// 登録失敗（200レスポンスで返却される）
				setMessage(data.message || "auth.registerFailed");
				return;
			}
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
			if (!data.success) {
				// ログイン失敗（200レスポンスで返却される）
				setMessage(data.message || "auth.loginFailed");
				return;
			}
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
					<div className="home-content">
						{/* ヒーローセクション */}
						<div className="d-flex align-items-center gap-5 flex-wrap">
							<div className="home-hero-text">
								<p className="home-welcome-label">{t("home.welcomeLabel")}</p>
								<h2 className="home-welcome-name">
									{t("home.hello")}、
									<span className="home-username">{user.username}</span>
									{t("home.san")}
								</h2>
								<p className="home-desc">{t("home.description")}</p>
								<div className="d-flex gap-3 flex-wrap mt-1">
									<button
										type="button"
										className="btn btn-primary"
										onClick={() => {
											setGameRoomId(null);
											setGameOpponent(null);
											navigateTo("online");
										}}
									>
										{t("home.ctaOnline")}
									</button>
									<button
										type="button"
										className="btn btn-outline-secondary"
										onClick={() => {
											setGameRoomId(null);
											setGameOpponent(null);
											navigateTo("game");
										}}
									>
										{t("home.ctaAi")}
									</button>
								</div>
							</div>

							{/* Pongコートイラスト */}
							<div className="home-pong-illustration">
								<svg
									width="300"
									height="200"
									viewBox="0 0 300 200"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect width="300" height="200" rx="12" fill="#1a1a2e" />
									<line
										x1="150"
										y1="10"
										x2="150"
										y2="190"
										stroke="#ffffff"
										strokeWidth="2"
										strokeDasharray="8 6"
										opacity="0.3"
									/>
									<rect
										x="16"
										y="70"
										width="10"
										height="60"
										rx="5"
										fill="#AFA9EC"
									/>
									<rect
										x="274"
										y="70"
										width="10"
										height="60"
										rx="5"
										fill="#AFA9EC"
									/>
									<circle cx="150" cy="100" r="8" fill="white" />
									<circle
										cx="150"
										cy="100"
										r="18"
										fill="none"
										stroke="white"
										strokeWidth="0.5"
										opacity="0.15"
									/>
									<circle
										cx="150"
										cy="100"
										r="32"
										fill="none"
										stroke="white"
										strokeWidth="0.5"
										opacity="0.08"
									/>
									<text
										x="75"
										y="30"
										textAnchor="middle"
										fill="#AFA9EC"
										fontSize="18"
										fontWeight="bold"
										fontFamily="monospace"
									>
										3
									</text>
									<text
										x="225"
										y="30"
										textAnchor="middle"
										fill="#AFA9EC"
										fontSize="18"
										fontWeight="bold"
										fontFamily="monospace"
									>
										5
									</text>
									<rect
										x="10"
										y="10"
										width="280"
										height="180"
										rx="10"
										fill="none"
										stroke="#AFA9EC"
										strokeWidth="1.5"
										opacity="0.4"
									/>
								</svg>
							</div>
						</div>

						{/* インフォカード */}
						<div className="row g-3">
							<div className="col-12 col-md-4">
								<div className="border rounded-3 p-3 d-flex flex-column gap-1 h-100">
									<p className="fw-medium small mb-0">
										{t("home.cardOnlineTitle")}
									</p>
									<p
										className="text-muted small mb-0"
										style={{ lineHeight: 1.6 }}
									>
										{t("home.cardOnlineDesc")}
									</p>
								</div>
							</div>
							<div className="col-12 col-md-4">
								<div className="border rounded-3 p-3 d-flex flex-column gap-1 h-100">
									<p className="fw-medium small mb-0">
										{t("home.cardAiTitle")}
									</p>
									<p
										className="text-muted small mb-0"
										style={{ lineHeight: 1.6 }}
									>
										{t("home.cardAiDesc")}
									</p>
								</div>
							</div>
							<div className="col-12 col-md-4">
								<div className="border rounded-3 p-3 d-flex flex-column gap-1 h-100">
									<p className="fw-medium small mb-0">
										{t("home.cardRankTitle")}
									</p>
									<p
										className="text-muted small mb-0"
										style={{ lineHeight: 1.6 }}
									>
										{t("home.cardRankDesc")}
									</p>
								</div>
							</div>
						</div>
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
						key={aiGameKey}
						mode="ai"
						roomId={gameRoomId ?? undefined}
						opponent={gameOpponent}
						onBack={() => setAiGameKey(Date.now())}
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
							setMessage("");
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
						<div className="mobile-header">
							<button
								className="hamburger-btn"
								onClick={() => setMenuOpen(!menuOpen)}
							>
								☰
							</button>
							<span className="mobile-title">ft_transcendence</span>
							<button className="lang-toggle" onClick={cycleLanguage}>
								{LANGUAGE_LABELS[i18n.language] || "EN"}
							</button>
						</div>
						<div
							className={`sidebar-overlay ${menuOpen ? "visible" : ""}`}
							onClick={() => setMenuOpen(false)}
						/>
						<nav className={`sidebar ${menuOpen ? "open" : ""}`}>
							<div className="mb-5">
								<h1 className="mb-2">ft_transcendence</h1>
								<button className="lang-toggle" onClick={cycleLanguage}>
									{LANGUAGE_LABELS[i18n.language] || "EN"}
								</button>
							</div>
							<ul className="list-unstyled flex-grow-1 ps-0">
								<li>
									<button
										className={currentPage === "home" ? "active" : ""}
										onClick={() => navigateTo("home")}
									>
										{t("nav.home")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "online" ? "active" : ""}
										onClick={() => handleNavigation("online", true)}
									>
										{t("nav.online")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "game" ? "active" : ""}
										onClick={() => handleNavigation("game", true)}
									>
										{t("nav.ai")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "history" ? "active" : ""}
										onClick={() => navigateTo("history")}
									>
										{t("nav.history")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "leaderboard" ? "active" : ""}
										onClick={() => navigateTo("leaderboard")}
									>
										{t("nav.leaderboard")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "chat" ? "active" : ""}
										onClick={() => navigateTo("chat")}
									>
										{t("nav.chat")}
									</button>
								</li>

								<li>
									<button
										className={
											currentPage.startsWith("profile") ? "active" : ""
										}
										onClick={() => navigateTo("profile")}
									>
										{t("nav.profile")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "friends" ? "active" : ""}
										onClick={() => navigateTo("friends")}
									>
										{t("nav.friends")}
									</button>
								</li>

								<li>
									<button
										className={
											currentPage === "friend-requests" ? "active" : ""
										}
										onClick={() => navigateTo("friend-requests")}
									>
										{t("nav.requests")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "stats" ? "active" : ""}
										onClick={() => navigateTo("stats")}
									>
										{t("nav.stats")}
									</button>
								</li>

								<li>
									<button
										className={currentPage === "settings" ? "active" : ""}
										onClick={() => navigateTo("settings")}
									>
										{t("nav.settings")}
									</button>
								</li>
							</ul>

							<div className="mt-auto">
								<button onClick={handleLogout} className="btn btn-danger w-100">
									{t("nav.logout")}
								</button>
							</div>
						</nav>

						<main className="main-content">
							<div className="flex-grow-1 p-5 overflow-auto">
								{renderContent()}
							</div>
							<footer
								className="d-flex justify-content-between align-items-center px-4 py-2 border-top bg-light flex-shrink-0"
								style={{ fontSize: "0.75rem" }}
							>
								<span className="text-muted">{t("legal.footer.rights")}</span>
								<div className="d-flex gap-3">
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
								<div className="text-center mb-5">
									<h1 className="mb-2">ft_transcendence</h1>
									<button className="lang-toggle" onClick={cycleLanguage}>
										{LANGUAGE_LABELS[i18n.language] || "EN"}
									</button>
								</div>

								<div className="auth-form">
									<div className="tabs">
										<button
											className={isLogin ? "active" : ""}
											onClick={() => {
												setIsLogin(true);
												setMessage("");
											}}
										>
											{t("auth.login")}
										</button>
										<button
											className={!isLogin ? "active" : ""}
											onClick={() => {
												setIsLogin(false);
												setMessage("");
											}}
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
						<footer
							className="d-flex justify-content-between align-items-center border-top mt-4 pt-3"
							style={{ fontSize: "0.75rem" }}
						>
							<span className="text-muted">{t("legal.footer.rights")}</span>
							<div className="d-flex gap-3">
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
			{pendingNavigation !== null && (
				<ConfirmDialog
					title={t("game.switchConfirmTitle")}
					message={t("game.switchConfirmMessage")}
					confirmLabel={t("game.switchConfirmOk")}
					cancelLabel={t("game.switchConfirmCancel")}
					onConfirm={handleConfirmLeave}
					onCancel={() => setPendingNavigation(null)}
				/>
			)}
		</div>
	);
}

export default App;
