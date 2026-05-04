import { selectRole } from '@/app/actions'

/**
 * Farm-friendly role selection screen.
 * Uses two prominent full-width buttons — no passwords, no email.
 * Submits to a Server Action that sets an httpOnly cookie and redirects to `/`.
 */
export function LoginScreen() {
  return (
    <div className="flex h-dvh flex-col bg-green-50">

      {/* Header */}
      <div className="flex-shrink-0 bg-green-700 px-4 py-4 text-center shadow-md">
        <p className="text-xs font-medium uppercase tracking-widest text-green-300">農業DX</p>
        <h1 className="mt-0.5 text-xl font-bold text-white">タスク管理システム</h1>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">

        {/* Icon + greeting */}
        <div className="mb-8 text-center">
          <div className="text-7xl" aria-hidden="true">🌱</div>
          <h2 className="mt-3 text-lg font-bold text-gray-800">ようこそ</h2>
          <p className="mt-1 text-sm text-gray-500">あなたの役割を選択してください</p>
        </div>

        {/* Role buttons */}
        <div className="w-full max-w-sm space-y-4">

          {/* Admin */}
          <form action={selectRole}>
            <input type="hidden" name="role" value="admin" />
            <button
              type="submit"
              className="
                flex w-full items-center gap-4 rounded-2xl
                bg-green-700 px-5 py-5 text-left text-white shadow-lg
                transition-transform active:scale-[0.97]
              "
            >
              <span className="text-4xl" aria-hidden="true">👨‍💼</span>
              <div className="flex-1">
                <p className="text-base font-bold">管理者として入る</p>
                <p className="mt-0.5 text-xs text-green-200">
                  Naoki — 全ハウスの管理・タスク一覧
                </p>
              </div>
              <span className="text-xl text-green-300" aria-hidden="true">›</span>
            </button>
          </form>

          {/* Staff */}
          <form action={selectRole}>
            <input type="hidden" name="role" value="staff" />
            <button
              type="submit"
              className="
                flex w-full items-center gap-4 rounded-2xl
                border-2 border-green-200 bg-white px-5 py-5 text-left shadow-md
                transition-transform active:scale-[0.97]
              "
            >
              <span className="text-4xl" aria-hidden="true">🧑‍🌾</span>
              <div className="flex-1">
                <p className="text-base font-bold text-gray-800">スタッフとして入る</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  農場マップ・明日の作業確認
                </p>
              </div>
              <span className="text-xl text-gray-300" aria-hidden="true">›</span>
            </button>
          </form>
        </div>

        <p className="mt-8 text-xs text-gray-400">この選択はブラウザに保存されます</p>
      </div>
    </div>
  )
}
