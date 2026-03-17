export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md p-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Daftar di Concertix
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Buat akun baru untuk mulai membeli tiket konser
        </p>

        <form className="space-y-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-300 mb-1">
              Nama Lengkap
            </label>
            <input
              id="full_name"
              type="text"
              placeholder="Nama lengkap"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="nama@email.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-300 mb-1">
              Konfirmasi Password
            </label>
            <input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Daftar
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6 text-sm">
          Sudah punya akun?{" "}
          <a href="/login" className="text-purple-400 hover:text-purple-300 underline">
            Masuk
          </a>
        </p>
      </div>
    </div>
  );
}
