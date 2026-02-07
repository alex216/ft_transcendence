import React, { useState, useEffect } from 'react';
import { register, login, getCurrentUser, logout } from './api.ts';
import './App.css';

function App() {
  // 状態管理（C++で言うと「グローバル変数」のようなもの）
  const [user, setUser] = useState(null); // 現在のログインユーザー
  const [isLogin, setIsLogin] = useState(true); // ログイン/登録の切り替え
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  // 初回ロード時にログイン状態を確認
  useEffect(() => {
    checkLoginStatus();
  }, []);

  // ログイン状態確認
  const checkLoginStatus = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      // ログインしていない場合
      setUser(null);
    }
  };

  // 登録処理
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await register(username, password);
      setMessage('登録成功！ログインしてください。');
      setIsLogin(true);
      setUsername('');
      setPassword('');
    } catch (error) {
      setMessage(error.response?.data?.message || '登録失敗');
    }
  };

  // ログイン処理
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await login(username, password);
      setUser(data.user);
      setMessage('ログイン成功！');
      setUsername('');
      setPassword('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'ログイン失敗');
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setMessage('ログアウトしました');
    } catch (error) {
      setMessage('ログアウト失敗');
    }
  };

  // ログイン済みの場合の画面
  if (user) {
    return (
      <div className="App">
        <div className="container">
          <h1>ft_transcendence</h1>
          <div className="user-info">
            <h2>ようこそ、{user.username}さん！</h2>
            <p>ユーザーID: {user.id}</p>
            <button onClick={handleLogout}>ログアウト</button>
          </div>
        </div>
      </div>
    );
  }

  // 未ログインの場合の画面
  return (
    <div className="App">
      <div className="container">
        <h1>ft_transcendence</h1>

        <div className="auth-form">
          <div className="tabs">
            <button
              className={isLogin ? 'active' : ''}
              onClick={() => setIsLogin(true)}
            >
              ログイン
            </button>
            <button
              className={!isLogin ? 'active' : ''}
              onClick={() => setIsLogin(false)}
            >
              登録
            </button>
          </div>

          <form onSubmit={isLogin ? handleLogin : handleRegister}>
            <h2>{isLogin ? 'ログイン' : 'ユーザー登録'}</h2>

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

            <button type="submit">
              {isLogin ? 'ログイン' : '登録'}
            </button>
          </form>

          {message && <p className="message">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default App;
