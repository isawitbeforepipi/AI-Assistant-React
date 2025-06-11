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
      
      request.onsuccess = () => {
        setDb(request.result);
        setIsDBReady(true); 
      }; 

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
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
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