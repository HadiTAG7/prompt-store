/** فتح منتقي ملفات وقراءة ملف JSON كنص — null عند الإلغاء */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** اسم ملف آمن من عنوان عربي */
export function safeFileName(title: string): string {
  return title.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-') || 'ملف';
}
