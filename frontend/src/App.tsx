import React, { useState, useEffect } from "react";
import { register, login, getCurrentUser, logout } from "./api.ts";
import Profile from "./components/Profile.tsx";
import ProfileEdit from "./components/ProfileEdit.tsx";
import FriendList from "./components/FriendList.tsx";
import FriendRequests from "./components/FriendRequests.tsx";
import "./App.css";

type Page = "home" | "profile" | "profile-edit" | "friends" | "friend-requests";

function App() {
	// 状態管理
	const [user, setUser] = useState(null);
	const [currentPage, setCurrentPage] = useState<Page>("home");
	const [isLogin, setIsLogin] = useState(true);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");

	// 初回ロード時にログイン状態を確認
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
			setMessage("登録成功！ログインしてください。");
			setIsLogin(true);
			setUsername("");
			setPassword("");
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "登録失敗");
		}
	};

	// ログイン処理
	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const data = await login(username, password);
			setUser(data.user);
			setMessage("ログイン成功！");
			setUsername("");
			setPassword("");
			setCurrentPage("home");
		} catch (err) {
			const error = err as { response?: { data?: { message?: string } } };
			setMessage(error.response?.data?.message || "ログイン失敗");
		}
	};

	// ログアウト処理
	const handleLogout = async () => {
		try {
			await logout();
			setUser(null);
			setCurrentPage("home");
			setMessage("ログアウトしました");
		} catch {
			setMessage("ログアウト失敗");
		}
	};

	// ページコンテンツをレンダリング
	const renderContent = () => {
		switch (currentPage) {
			case "home":
				return (
					<div className="home">
						<h2>ようこそ、{user.username}さん！</h2>
						<p>ユーザーID: {user.id}</p>
						<p>左のメニューから機能を選択してください。</p>
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
				return <FriendList />;
			case "friend-requests":
				return <FriendRequests />;
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
							<h1>ft_transcendence</h1>
							<ul className="nav-menu">
								<li>
									<button
										className={currentPage === "home" ? "active" : ""}
										onClick={() => setCurrentPage("home")}
									>
										ホーム
									</button>
								</li>
								<li>
									<button
										className={
											currentPage.startsWith("profile") ? "active" : ""
										}
										onClick={() => setCurrentPage("profile")}
									>
										プロフィール
									</button>
								</li>
								<li>
									<button
										className={currentPage === "friends" ? "active" : ""}
										onClick={() => setCurrentPage("friends")}
									>
										フレンド
									</button>
								</li>
								<li>
									<button
										className={
											currentPage === "friend-requests" ? "active" : ""
										}
										onClick={() => setCurrentPage("friend-requests")}
									>
										リクエスト
									</button>
								</li>
							</ul>
							<div className="sidebar-footer">
								<button onClick={handleLogout} className="btn-logout">
									ログアウト
								</button>
							</div>
						</nav>

						<main className="main-content">{renderContent()}</main>
					</>
				) : (
					<>
						{/* ログイン前：認証フォーム */}
						<div className="auth-content">
							<h1>ft_transcendence</h1>

							<div className="auth-form">
								<div className="tabs">
									<button
										className={isLogin ? "active" : ""}
										onClick={() => setIsLogin(true)}
									>
										ログイン
									</button>
									<button
										className={!isLogin ? "active" : ""}
										onClick={() => setIsLogin(false)}
									>
										登録
									</button>
								</div>

								<form onSubmit={isLogin ? handleLogin : handleRegister}>
									<h2>{isLogin ? "ログイン" : "ユーザー登録"}</h2>

									<input
										type="text"
										placeholder="ユーザー名"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										required
									/>

									<input
										type="password"
										placeholder="パスワード"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
									/>

									<button type="submit">{isLogin ? "ログイン" : "登録"}</button>
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
