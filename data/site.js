/* 站台設定與行程索引 — 由後台發布。存的是密碼雜湊，不是密碼本身。
   trips[] 只放選單需要的欄位，行程內容在 trips/<id>/ 底下，點進去才載入。 */
window.SITE = {
  "gate": {
    "enabled": true,
    "salt": "4tf01iv822qmtv3m34y",
    "entry": "8d11045ed0fc2116a5d9965b56091b14fbe5546d23a92028c47da3857120f44b",
    "admin": "904dffc2277b8c137f62944bfc9a73ee64e96102414742f5b393319c3c504a00"
  },
  "repo": {
    "owner": "ing0001000-jpg",
    "name": "kyushu-2026",
    "branch": "main"
  },
  "cacheVersion": 9,
  "trips": [
    {
      "id": "kyushu-2026",
      "title": "2026 九州自駕 9 日",
      "start": "2026-09-27",
      "end": "2026-10-05",
      "color": "#cf4229",
      "artPacks": [
        "jp-kyushu"
      ]
    }
  ]
};
