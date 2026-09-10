/* 站台設定。密碼由你在後台（#/admin）自己設定，我不經手也不知道。
   entry / admin 存的是 SHA-256 雜湊，不是密碼本身。 */
window.CONFIG = {
  gate: {
    enabled: false,   /* 設好密碼後由後台自動改成 true */
    salt: '',
    entry: '',        /* 進入密碼的雜湊 */
    admin: ''         /* 後台密碼的雜湊（要和進入密碼不同，全團都知道進入密碼） */
  },
  repo: { owner: 'ing0001000-jpg', name: 'kyushu-2026', branch: 'main' },
  cacheVersion: 4
};
