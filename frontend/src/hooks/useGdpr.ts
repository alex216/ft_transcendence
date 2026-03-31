import { api } from "../api";

export function useGdpr() {
	// GETなのでCSRFトークン不要
	const exportData = async (): Promise<void> => {
		const response = await api.get("/gdpr/export", {
			responseType: "blob",
		});

		const contentDisposition = response.headers["content-disposition"] as
			| string
			| undefined;
		let filename = "my-data.json";
		if (contentDisposition) {
			const match = contentDisposition.match(/filename="?([^";\s]+)"?/);
			if (match) filename = match[1];
		}

		const url = URL.createObjectURL(response.data as Blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// DELETEなのでCSRFトークンが必要（api インスタンスのインターセプターが自動付与）
	const deleteAccount = async (): Promise<void> => {
		await api.delete("/gdpr/account");
	};

	return { exportData, deleteAccount };
}
