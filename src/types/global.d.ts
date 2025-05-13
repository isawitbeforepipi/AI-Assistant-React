//全局类型声明扩展
//目的是为浏览器的语音识别相关 API（SpeechRecognition）添加类型定义，确保在项目中使用时有完整的类型提示和类型安全
//不加这个声明，TS 会提示 SpeechRecognition 或 webkitSpeechRecognition 不存在或缺少类型。
declare global {
  //给全局 window 对象添加属性。
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  
  //自定义 SpeechRecognition 接口，声明它的属性和方法
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onend: () => void;
    start(): void;
    stop(): void;
  }
  
  //自定义语音识别成功事件，里面有识别结果 results
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
  
  //自定义识别出错时的事件
  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }
}

export {};