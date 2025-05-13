import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL + '/api/generate';


export const generateImage = async (prompt: string): Promise<{ imageUrl: string | null, base64Images: string | null }>  => {
  try {
    // 发送请求给后端，提交生成图像的任务
    const response = await axios.post(`${BASE_URL}/submit`, { prompt });

    if (response.data.status === "SUCCEEDED") {
      // 返回生成的图像 URL 和 Base64 图像
      return {
        imageUrl: response.data.images,
        base64Images: response.data.base64Images,
      };
    } else {
      // 任务失败
      return { imageUrl: null, base64Images: null };
    }
  } catch (error) {
    console.error("Error generating image:", error);
    return { imageUrl: null, base64Images: null };
  }
};