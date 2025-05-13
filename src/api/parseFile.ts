const BASE_URL = import.meta.env.VITE_BACKEND_URL + '/api/ocr';
export async function parseFile(file: File): Promise<string> {
  const fileType = file.type;
  
  // 判断文件类型，如果是图片，调用 parseImage 进行处理
  if (fileType.startsWith("image/")) {
    //创建一个 FileReader 实例，用来读取本地文件内容。
    const reader = new FileReader();
    // 返回一个 Promise，确保文件被成功读取并转化为 base64
    const readFileAsBase64 = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result.toString().split(",")[1]); // 去掉 base64 前缀部分
        } else {
          reject(new Error("无法读取文件"));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file); // 转换为 base64
    });
    const base64Image = await readFileAsBase64;

    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image, // 发送 base64 编码图片
      }),
    });
    const data = await response.json();
    // 检查是否有文字识别结果
    if (data.words_result && data.words_result.length > 0) {
      return data.words_result.map((item: any) => item.words).join("\n");
    } else {
      return "这张图片似乎没有文字内容。";
    }
  } else {
    throw new Error("不支持的文件类型");
  }
}