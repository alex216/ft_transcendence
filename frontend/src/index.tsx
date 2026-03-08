import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n"; // i18n初期化
import App from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");
const root = ReactDOM.createRoot(rootElement);
root.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
