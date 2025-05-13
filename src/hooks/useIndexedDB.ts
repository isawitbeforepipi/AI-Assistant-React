// src/hooks/useIndexedDB.ts
import { useEffect, useState } from 'react';

const DB_NAME = 'chatDB';
const STORE_NAME = 'messages';

export const useIndexedDB = () => {
  // 存储数据库对象
  const [db, setDb] = useState<IDBDatabase | null>(null);
  // 数据库是否准备好
  const [isDBReady, setIsDBReady] = useState(false);
  // 记录初始化错误
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const openDB = () => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => {
        setError(new Error('Failed to open IndexedDB'));
      };
      
      // 把打开成功的 IndexedDB 数据库对象 request.result 存入 React 的状态变量 db 中
      request.onsuccess = () => {
        setDb(request.result);
        setIsDBReady(true); // ✅ 标记初始化完成
      }; 

      // 如果是第一次打开（或版本变更）
      // 创建一个表叫 messages，并设置主键自增。
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { autoIncrement: true });
        }
      };
    };

    openDB();
  }, []);

  const saveMessage = (message: any) => {
    if (!db) return;
    //创建一个 读写事务，允许对 messages 这个表进行写入操作
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    //从事务中获取这个表的引用
    const store = transaction.objectStore(STORE_NAME);
    //把传入的 message 添加到 IndexedDB 中的 messages 表里
    store.add(message);
  };

  const getMessages = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not initialized'));

      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      //当数据获取成功时
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to fetch messages from IndexedDB'));
    });
  };

  const clearAllMessages = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('Database not initialized'));

      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear messages'));
    });
  };

  return { saveMessage, getMessages, clearAllMessages, isDBReady, error };
};