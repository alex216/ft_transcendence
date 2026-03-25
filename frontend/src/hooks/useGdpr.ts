import axios from "axios";
import { getCsrfToken } from "./useCsrfToken";

const API_URL = import.meta.env.VITE_API_URL ?? "https://localhost/api";

export function useGdpr() {
	// GETなのでCSRFトークン不要
	const exportData = async (): Promise<void> => {
		const response = await axios.get(`${API_URL}/gdpr/export`, {
			withCredentials: true,
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

	// DELETEなのでCSRFトークンが必要
	const deleteAccount = async (): Promise<void> => {
		const csrfToken = await getCsrfToken();
		await axios.delete(`${API_URL}/gdpr/account`, {
			withCredentials: true,
			headers: { "x-csrf-token": csrfToken },
		});
	};

	return { exportData, deleteAccount };
}
