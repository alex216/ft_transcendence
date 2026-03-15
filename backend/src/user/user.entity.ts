import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  // 【修正】nullable: true にする
  // 42 OAuthログインのユーザーはパスワードを持たないため
  @Column({ nullable: true })
  password?: string;

  // 【新規追加】マイルストーン6: 42 OAuth連携用
  @Column({ unique: true, nullable: true })
  forty_two_id?: string;

  // 【新規追加】マイルストーン6: 二要素認証(2FA)用
  @Column({ default: false })
  is_2fa_enabled: boolean;

  @Column({ nullable: true })
  two_factor_secret?: string;

  // 【修正】CreateDateColumnを使うとスッキリ書けます
  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;
}