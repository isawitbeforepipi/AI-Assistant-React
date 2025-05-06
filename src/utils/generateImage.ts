import axios from "axios";

const BASE_URL = "http://localhost:3001/api/generate";

// 提交提示词，返回任务 ID
const submitPrompt = async (prompt: string): Promise<string | null> => {
  try {
    const res = await axios.post(`${BASE_URL}/submit`, { prompt });
    const taskId: string = res.data.taskId;
    // console.log("✅ 提交成功，taskId:", taskId);
    return taskId;
  } catch (err: any) {
    // console.error("❌ 提交失败:", err.response?.data || err.message);
    return null;
  }
};


const pollResult = async (
  taskId: string
): Promise<{ imageUrl: string | null; base64Images: string | null }> => {
  while (true) {
    try {
      const res = await axios.get(`${BASE_URL}/result/${taskId}`);
      const { status, images, base64Images } = res.data;

      // console.log("轮询状态:", status);

      if (status === "SUCCEEDED" && Array.isArray(images) && images.length > 0) {
        // console.log("🎉 图像生成成功:", images[0]);
        // console.log("🎉 图像生成成功:",base64Images[0])
        return {
          imageUrl: images[0],
          base64Images: base64Images[0] || '',
        };
      } else if (status === "FAILED") {
        console.error("❌ 图像生成失败");
        return {
          imageUrl: null,
          base64Images: null,
        };
      }

      // 等待 2 秒再轮询
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err: any) {
      console.error("❌ 请求出错:", err.response?.data || err.message);
      return {
        imageUrl: null,
        base64Images: null,
      };
    }
  }
};


export const generateImage = async (prompt: string): Promise<{ imageUrl: string | null, base64Images: string | null }> => {
  const taskId = await submitPrompt(prompt);
  if (!taskId) return { imageUrl: null, base64Images: null }; // 如果没有任务 ID，则返回空

  const { imageUrl, base64Images } = await pollResult(taskId); // 获取轮询结果
  if (imageUrl) {
    // 返回图像 URL 和 Base64 图像数组
    return { imageUrl, base64Images };
  } else {
    // 如果没有图像生成成功，则返回 null
    return { imageUrl: null, base64Images: null };
  }
};