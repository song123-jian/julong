// 开发调试：拦截 localStorage 读写操作
if (import.meta.env.DEV) {
  const originalSet = localStorage.setItem.bind(localStorage);
  const originalGet = localStorage.getItem.bind(localStorage);
  const originalRemove = localStorage.removeItem.bind(localStorage);
  const originalClear = localStorage.clear.bind(localStorage);

  localStorage.setItem = function (key: string, value: string) {
    const preview = value.length > 80 ? value.slice(0, 80) + '...' : value;
    console.log(`%c[SET]%c ${key} %c${preview.length > 0 ? `(${value.length} chars)` : ''}`, 'color:#059669;font-weight:bold', 'color:#1A1A2E', 'color:#6C757B');
    return originalSet(key, value);
  };

  localStorage.getItem = function (key: string) {
    const result = originalGet(key);
    const preview = result ? (result.length > 80 ? result.slice(0, 80) + '...' : result) : 'null';
    console.log(`%c[GET]%c ${key} %c=> ${preview}`, 'color:#0284C7;font-weight:bold', 'color:#1A1A2E', 'color:#6C757B');
    return result;
  };

  localStorage.removeItem = function (key: string) {
    console.log(`%c[DEL]%c ${key}`, 'color:#DC2626;font-weight:bold', 'color:#1A1A2E');
    return originalRemove(key);
  };

  localStorage.clear = function () {
    console.log('%c[CLR]%c localStorage.clear()', 'color:#DC2626;font-weight:bold', 'color:#1A1A2E');
    return originalClear();
  };

  console.log('%c🔍 localStorage 调试日志已启用', 'color:#D97706;font-weight:bold');
}
