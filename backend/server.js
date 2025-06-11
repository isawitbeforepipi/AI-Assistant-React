import express from "express";
import cors from "cors";
import { createServer } from "http";
import { setupWSServer } from "./routes/chat.js";
import dotenv from "dotenv";
import ocrRoute from "./routes/ocr.js";
import generateImageRoute from "./routes/generateImage.js"; // 引入生成图像路由

dotenv.config();

const app = express(); //创建express应用
const PORT = process.env.PORT || 3001;

// 配置中间件
//启用跨域资源共享，允许跨域请求访问 API。
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? "https://ai-chatbot-g3h3tluqk-isawitbeforepipis-projects.vercel.app/" // 生产环境：允许来自 Vercel 的请求
      : "http://localhost:5173", // 本地开发环境：允许来自本地的请求
  methods: ["GET", "POST"], // 允许的 HTTP 方法
};
app.use(cors(corsOptions)); // 启用 CORS 中间件并传递配置
//解析 JSON 格式的请求体,设置请求体的大小限制为 10MB
app.use(express.json({ limit: "10mb" }));
//启用 URL 编码的请求体解析
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 配置路由
app.use("/api/ocr", ocrRoute);
app.use("/api/generate", generateImageRoute);

// 创建 HTTP + WebSocket 服务器
const server = createServer(app); //HTTP服务器
setupWSServer(server);

// 启动服务
server.listen(PORT, () => {
  // console.log(`✅ 服务运行在 http://localhost:${PORT}`);
});
