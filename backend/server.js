import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupWSServer } from "./routes/chat.js";
import dotenv from "dotenv";
import ocrRoute from "./routes/ocr.js";
import generateImageRoute from "./routes/generateImage.js"; // 引入生成图像路由

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// REST API 路由
app.use("/api/ocr", ocrRoute);
app.use("/api/generate", generateImageRoute); // 新增生成图像路由

// 创建 HTTP + WebSocket 服务器
const server = createServer(app);
setupWSServer(server);

// 启动服务
server.listen(PORT, () => {
  // console.log(`✅ 服务运行在 http://localhost:${PORT}`);
});
