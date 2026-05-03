// Root page — placeholder until geolocation-based redirect is wired up.
// In production, this page can detect the nearest house via GPS and redirect
// to /house/[id], or show a house selector for manual pick.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">🌱</div>
      <h1 className="text-2xl font-bold text-green-800">農業DXタスク管理システム</h1>
      <p className="text-gray-600 text-sm max-w-xs">
        ハウス入口のNFCタグまたはQRコードをスキャンして作業を開始してください。
      </p>
      <p className="text-gray-400 text-xs">
        または <code className="bg-gray-100 px-1 rounded">/house/[ハウスID]</code> に直接アクセス
      </p>
    </main>
  )
}
