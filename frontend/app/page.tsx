import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <main className="w-full max-w-4xl px-8 py-16">
        <div className="text-center space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Healthcare Chat Platform
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Secure, multilingual communication between patients and healthcare providers
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            {/* Patient/User Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full dark:bg-blue-900/20 mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Patient Portal
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Access your healthcare consultations
                </p>
              </div>
              <div className="space-y-3">
                <Link
                  href="/patient/create-room"
                  className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
                >
                  Start Anonymous Chat
                </Link>
                <Link
                  href="/user/login"
                  className="block w-full py-3 px-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium rounded-lg transition-colors text-center"
                >
                  Login
                </Link>
                <Link
                  href="/user/register"
                  className="block w-full py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors text-center"
                >
                  Register
                </Link>
              </div>
            </div>

            {/* Doctor Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full dark:bg-green-900/20 mb-4">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Doctor Portal
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Manage patient consultations
                </p>
              </div>
              <div className="space-y-3">
                <Link
                  href="/doctor/join-room"
                  className="block w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-center"
                >
                  Join Patient Room
                </Link>
                <Link
                  href="/doctor/login"
                  className="block w-full py-3 px-4 border-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 font-medium rounded-lg transition-colors text-center"
                >
                  Login
                </Link>
                <Link
                  href="/doctor/register"
                  className="block w-full py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors text-center"
                >
                  Register
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Secure • Encrypted • Multilingual • HIPAA Compliant
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
