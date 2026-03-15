import { SetMetadata } from "@nestjs/common";

// このデコレーターを付けたエンドポイントはJWT認証をスキップする
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
