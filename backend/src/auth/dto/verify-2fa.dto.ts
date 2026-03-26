import { IsString, IsNotEmpty, Length, Matches } from "class-validator";

export class VerifyTwoFactorDto {
	// TOTPコード: 必ず6桁の数字
	@IsString({ message: "コードは文字列で入力してください" })
	@IsNotEmpty({ message: "コードは必須です" })
	@Length(6, 6, { message: "コードは6桁で入力してください" })
	@Matches(/^\d{6}$/, { message: "コードは数字6桁で入力してください" })
	token: string;
}
