diff --git a/backend/src/user/user.entity.ts b/backend/src/user/user.entity.ts
index 5728d85..8e7d63f 100644
--- a/backend/src/user/user.entity.ts
+++ b/backend/src/user/user.entity.ts
@@ -3,6 +3,7 @@ import {
Column,
PrimaryGeneratedColumn,
CreateDateColumn,

- UpdateDateColumn,
  } from "typeorm";

@Entity("users")
@@ -18,6 +19,10 @@ export class User {
@Column({ nullable: true })
password?: string;

@Column({ unique: true, nullable: true })
forty_two_id?: string;

@@ -29,7 +34,18 @@ export class User {
@Column({ nullable: true })
two_factor_secret?: string;

- @Column({ default: false })
- is_online: boolean;
-
- @Column({ type: "timestamp", nullable: true })
- last_seen_at?: Date;
-     @CreateDateColumn({ type: "timestamp" })
      created_at: Date;
-
- @UpdateDateColumn({ type: "timestamp" })
- updated_at: Date;
  }

diff --git a/backend/src/user/user-status.service.ts b/backend/src/user/user-status.service.ts
new file mode 100644
index 0000000..045d224
--- /dev/null
+++ b/backend/src/user/user-status.service.ts
@@ -0,0 +1,37 @@
+import { Injectable } from "@nestjs/common";
+import { InjectRepository } from "@nestjs/typeorm";
+import { Repository } from "typeorm";
+import { User } from "./user.entity";

- +@Injectable()
  +export class UserStatusService {
- constructor(
-     @InjectRepository(User)
-     private userRepository: Repository<User>,
- ) {}
-
- async setOnline(userId: number): Promise<void> {
-     await this.userRepository.update(userId, { is_online: true });
- }
-
- async setOffline(userId: number): Promise<void> {
-     await this.userRepository.update(userId, {
-     	is_online: false,
-     	last_seen_at: new Date(),
-     });
- }
-
- async isOnline(userId: number): Promise<boolean> {
-     const user = await this.userRepository.findOne({
-     	where: { id: userId },
-     	select: ["is_online"],
-     });
-     return user?.is_online ?? false;
- }
  +}

diff --git a/backend/src/user/user.module.ts b/backend/src/user/user.module.ts
index 0f7d922..f04be8f 100644
--- a/backend/src/user/user.module.ts
+++ b/backend/src/user/user.module.ts
@@ -2,13 +2,14 @@ import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity";
import { UserService } from "./user.service";
+import { UserStatusService } from "./user-status.service";

@Module({
imports: [
TypeOrmModule.forFeature([User]),
],

- providers: [UserService],
- exports: [UserService],

* providers: [UserService, UserStatusService],
* exports: [UserService, UserStatusService],
  })
  export class UserModule {}

diff --git a/backend/src/auth/auth.service.ts b/backend/src/auth/auth.service.ts
index 6bc3cf7..ca63f5a 100644
--- a/backend/src/auth/auth.service.ts
+++ b/backend/src/auth/auth.service.ts
@@ -3,6 +3,8 @@ import { InjectRepository } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { User } from "../user/user.entity";
+import { UserStatusService } from "../user/user-status.service";
+import { PresenceService } from "../chat/presence.service";
import \* as bcrypt from "bcrypt";

@Injectable()
@@ -13,8 +15,22 @@ export class AuthService {
@InjectRepository(User)
private userRepository: Repository<User>,
private jwtService: JwtService,

-     private userStatusService: UserStatusService,
-     private presenceService: PresenceService,

  ) {}

- async notifyOnline(userId: number): Promise<void> {
-     await this.userStatusService.setOnline(userId);
-     await this.presenceService.broadcastStatusToFriends(userId, true);
- }
-
- async notifyOffline(userId: number): Promise<void> {
-     await this.userStatusService.setOffline(userId);
-     await this.presenceService.broadcastStatusToFriends(userId, false);
- }
-     generateToken(user: User): string {

diff --git a/backend/src/auth/auth.controller.ts b/backend/src/auth/auth.controller.ts
index ca7cfe5..80a9cd3 100644
--- a/backend/src/auth/auth.controller.ts
+++ b/backend/src/auth/auth.controller.ts
@@ -115,6 +115,7 @@ export class AuthController {
const token = this.authService.generateToken(user);
setJwtCookie(res, token);

-     await this.authService.notifyOnline(user.id);
      return res.redirect(`${frontendUrl}/home`);

@@ -137,6 +137,7 @@ export class AuthController {
const token = this.authService.generateToken(user);
setJwtCookie(res, token);

-     await this.authService.notifyOnline(user.id);
      return { success: true, message: "success.auth.registered", ... };

@@ -183,6 +183,7 @@ export class AuthController {
const token = this.authService.generateToken(user);
setJwtCookie(res, token);

-     await this.authService.notifyOnline(user.id);
      return { success: true, message: "success.auth.loggedIn", ... };

@@ -231,6 +231,7 @@ export class AuthController {
const accessToken = this.authService.generateToken(user);
setJwtCookie(res, accessToken);

-     await this.authService.notifyOnline(user.id);
      return { success: true, message: "success.auth.twoFaVerified" };

@@ -289,8 +293,10 @@ export class AuthController {
@Post("logout")
async logout(

-     @Req() req: AuthenticatedRequest,
      @Res({ passthrough: true }) res: Response,
  ): Promise<LogoutResponse> {
-     await this.authService.notifyOffline(req.user.id);
      res.clearCookie("access_token");

diff --git a/backend/src/auth/auth.module.ts b/backend/src/auth/auth.module.ts
index c09d188..ec214b7 100644
--- a/backend/src/auth/auth.module.ts
+++ b/backend/src/auth/auth.module.ts
@@ -8,6 +8,8 @@ import { JwtStrategy } from "./strategies/jwt.strategy";
+import { UserModule } from "../user/user.module";
+import { ChatModule } from "../chat/chat.module";

@Module({
imports: [
TypeOrmModule.forFeature([User]),
PassportModule,
JwtModule.register({ ... }),

-     UserModule,
-     ChatModule,
      ],
      controllers: [AuthController],
      providers: [AuthService, TwoFactorService, FortyTwoStrategy, JwtStrategy],
      exports: [AuthService],
  })

diff --git a/backend/src/chat/presence.service.ts b/backend/src/chat/presence.service.ts
new file mode 100644
index 0000000..xxxxxxx
--- /dev/null
+++ b/backend/src/chat/presence.service.ts
@@ -0,0 +1,126 @@
+import { Injectable, Logger } from "@nestjs/common";
+import { InjectRepository } from "@nestjs/typeorm";
+import { Repository } from "typeorm";
+import { Server } from "socket.io";
+import { Friend } from "../friend/friend.entity";
+import { UserStatusService } from "../user/user-status.service";

- +@Injectable()
  +export class PresenceService {
- private readonly logger = new Logger(PresenceService.name);
- private readonly userSockets = new Map<number, Set<string>>();
- private static readonly OFFLINE_GRACE_PERIOD_MS = 5000;
- private server: Server;
-
- constructor(
-     private readonly userStatusService: UserStatusService,
-     @InjectRepository(Friend)
-     private readonly friendRepository: Repository<Friend>,
- ) {}
-
- setServer(server: Server): void {
-     this.server = server;
- }
-
- async handleConnect(userId: number, socketId: string): Promise<void> {
-     const isFirst = this.addSocket(userId, socketId);
-     if (isFirst) {
-     	const wasOnline = await this.userStatusService.isOnline(userId);
-     	if (!wasOnline) {
-     		await this.userStatusService.setOnline(userId);
-     		await this.broadcastStatusToFriends(userId, true);
-     	}
-     }
- }
-
- handleDisconnect(userId: number, socketId: string): void {
-     const allGone = this.removeSocket(userId, socketId);
-     if (allGone) {
-     	this.scheduleOffline(userId);
-     }
- }
-
- isConnected(userId: number): boolean {
-     return this.userSockets.has(userId);
- }
-
- async broadcastStatusToFriends(userId: number, isOnline: boolean): Promise<void> {
-     const relations = await this.friendRepository.find({
-     	where: { userId },
-     	select: ["friendId"],
-     });
-     const friendIds = relations.map((r) => r.friendId);
-     if (friendIds.length === 0) return;
-     this.emitToUsers(friendIds, "userStatusChanged", { userId, isOnline });
- }
-
- emitToUsers(userIds: number[], event: string, payload: unknown): void {
-     for (const uid of userIds) {
-     	const socketIds = this.userSockets.get(uid);
-     	if (!socketIds) continue;
-     	for (const socketId of socketIds) {
-     		this.server.to(socketId).emit(event, payload);
-     	}
-     }
- }
-
- private addSocket(userId: number, socketId: string): boolean {
-     const isFirst = !this.userSockets.has(userId);
-     if (isFirst) {
-     	this.userSockets.set(userId, new Set());
-     }
-     this.userSockets.get(userId)!.add(socketId);
-     return isFirst;
- }
-
- private removeSocket(userId: number, socketId: string): boolean {
-     const sockets = this.userSockets.get(userId);
-     if (!sockets) return true;
-     sockets.delete(socketId);
-     if (sockets.size === 0) {
-     	this.userSockets.delete(userId);
-     	return true;
-     }
-     return false;
- }
-
- private scheduleOffline(userId: number): void {
-     setTimeout(() => {
-     	if (!this.isConnected(userId)) {
-     		void this.handleWentOffline(userId);
-     	}
-     }, PresenceService.OFFLINE_GRACE_PERIOD_MS);
- }
-
- private async handleWentOffline(userId: number): Promise<void> {
-     const wasOnline = await this.userStatusService.isOnline(userId);
-     if (!wasOnline) return;
-     await this.userStatusService.setOffline(userId);
-     await this.broadcastStatusToFriends(userId, false);
-     this.logger.log(`User ${userId} went offline (grace period expired)`);
- }
  +}

diff --git a/backend/src/chat/chat.gateway.ts b/backend/src/chat/chat.gateway.ts
index 3c1e330..122cde2 100644
--- a/backend/src/chat/chat.gateway.ts
+++ b/backend/src/chat/chat.gateway.ts
@@ -1,5 +1,6 @@
import {
WebSocketGateway,

- WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  @@ -9,36 +9,52 @@ import { Logger } from "@nestjs/common";
  -import { Socket } from "socket.io";
  +import { Server, Socket } from "socket.io";
  +import { parse } from "cookie";
  +import { JwtService } from "@nestjs/jwt";
  import { ChatService } from "./chat.service";
  +import { PresenceService } from "./presence.service";
  import { ChatMessage } from "../../../shared/chat.interface";

@WebSocketGateway({ cors: corsConfig, namespace: "chat" })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

- private logger: Logger = new Logger("ChatGateway");

* @WebSocketServer()
* server: Server;
* private readonly logger = new Logger(ChatGateway.name);

- constructor(private readonly chatService: ChatService) {}

* constructor(
*     private readonly chatService: ChatService,
*     private readonly jwtService: JwtService,
*     private readonly presenceService: PresenceService,
* ) {}

- afterInit() {

* afterInit(server: Server) {
*     this.presenceService.setServer(server);
      this.logger.log("WebSocket Gateway Initialized");
  }

- handleConnection(client: Socket) {

* async handleConnection(client: Socket) {
  this.logger.log(`🚀 Client connected: ${client.id}`);
*     try {
*     	const token = parse(client.handshake.headers.cookie ?? "")["access_token"];
*     	if (!token) return;
*     	const payload = this.jwtService.verify<{ sub: number }>(token);
*     	const userId = payload.sub;
*     	(client as Socket & { data: { userId?: number } }).data = { userId };
*     	await this.presenceService.handleConnect(userId, client.id);
*     } catch {}

  }

  handleDisconnect(client: Socket) {
  this.logger.log(`❌ Client disconnected: ${client.id}`);

*     const userId = (client as Socket & { data?: { userId?: number } }).data?.userId;
*     if (!userId) return;
*     this.presenceService.handleDisconnect(userId, client.id);

  }

  // joinRoom, sendMessage は変更なし

diff --git a/backend/src/chat/chat.module.ts b/backend/src/chat/chat.module.ts
index 8b2c0f6..bc51431 100644
--- a/backend/src/chat/chat.module.ts
+++ b/backend/src/chat/chat.module.ts
@@ -1,13 +1,23 @@
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
+import { JwtModule } from "@nestjs/jwt";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
+import { PresenceService } from "./presence.service";
import { Chat } from "./chat.entity";
+import { Friend } from "../friend/friend.entity";
+import { UserModule } from "../user/user.module";

@Module({

- imports: [TypeOrmModule.forFeature([Chat])],
- providers: [ChatGateway, ChatService],

* imports: [
*     TypeOrmModule.forFeature([Chat, Friend]),
*     UserModule,
*     JwtModule.register({ secret: process.env.JWT_SECRET || "fallback-jwt-secret" }),
* ],
* providers: [ChatGateway, ChatService, PresenceService],
* exports: [PresenceService],
  })
  export class ChatModule {}

diff --git a/backend/src/friend/friend.module.ts b/backend/src/friend/friend.module.ts
index 5540f12..1d09ee7 100644
--- a/backend/src/friend/friend.module.ts
+++ b/backend/src/friend/friend.module.ts
@@ -6,11 +6,13 @@ import { ProfileModule } from "../profile/profile.module";
+import { UserModule } from "../user/user.module";

@Module({
imports: [
TypeOrmModule.forFeature([FriendRequest, Friend, User]),
ProfileModule,

-     UserModule,
  ],

diff --git a/backend/src/friend/friend.service.ts b/backend/src/friend/friend.service.ts
index 6ea5d69..0070db4 100644
--- a/backend/src/friend/friend.service.ts
+++ b/backend/src/friend/friend.service.ts
@@ -10,6 +10,7 @@ import { ProfileService } from "../profile/profile.service";
+import { UserStatusService } from "../user/user-status.service";

@Injectable()
export class FriendService {
constructor(
...
private profileService: ProfileService,

-     private userStatusService: UserStatusService,
  ) {}

@@ -171,6 +173,7 @@ export class FriendService {
friendId: relation.friendId,
createdAt: relation.createdAt.toISOString(),
friend: profile,

-     		isOnline: await this.userStatusService.isOnline(relation.friendId),
      	};

diff --git a/backend/src/migrations/1776071469705-InitialSchema.ts b/backend/src/migrations/1776071469705-InitialSchema.ts
index a7705f4..38400a7 100644
--- a/backend/src/migrations/1776071469705-InitialSchema.ts
+++ b/backend/src/migrations/1776071469705-InitialSchema.ts
@@ -5,7 +5,7 @@ export class InitialSchema1776071469705 implements MigrationInterface {

-     `CREATE TABLE "users" (..., "two_factor_secret" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), ...)`

*     `CREATE TABLE "users" (..., "two_factor_secret" character varying, "is_online" boolean NOT NULL DEFAULT false, "last_seen_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), ...)`

diff --git a/shared/chat.interface.ts b/shared/chat.interface.ts
index a1e0659..12f8c43 100644
--- a/shared/chat.interface.ts
+++ b/shared/chat.interface.ts
@@ -5,3 +5,9 @@ export interface ChatMessage {
createdAt?: Date;
}

- +export interface UserStatusChangedEvent {
- userId: number;
- isOnline: boolean;
  +}

diff --git a/shared/friend.types.ts b/shared/friend.types.ts
index 8fd1e9e..8a1c008 100644
--- a/shared/friend.types.ts
+++ b/shared/friend.types.ts
@@ -86,6 +86,7 @@ export interface GetFriendsResponse {
createdAt: string;
friend: GetProfileResponse;

-     isOnline: boolean;
      }>;
  }
