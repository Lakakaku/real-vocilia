// Offline page for when the user has no internet connection
// This page provides helpful information and offline functionality

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Offline Icon */}
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900">
          You're Offline
        </h1>

        {/* Description */}
        <div className="space-y-3 text-gray-600">
          <p>
            It looks like you don't have an internet connection right now.
          </p>
          <p>
            To use Vocilia and validate store codes, you'll need to be online.
          </p>
        </div>

        {/* Action Steps */}
        <div className="bg-white rounded-lg p-6 shadow-sm border space-y-4">
          <h2 className="font-semibold text-gray-900">What you can do:</h2>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                1
              </div>
              <p>Check your WiFi or mobile data connection</p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                2
              </div>
              <p>Try moving to an area with better signal</p>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                3
              </div>
              <p>Refresh this page when you're back online</p>
            </div>
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-2">
          <p>
            This page will automatically refresh when you're back online.
          </p>
          <p>
            Need help? Visit our support page when you're connected.
          </p>
        </div>

        {/* Footer Info */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Offline</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Vocilia</span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-reload script */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Auto-reload when back online
            window.addEventListener('online', function() {
              console.log('Back online, reloading...');
              setTimeout(() => {
                window.location.href = '/';
              }, 1000);
            });

            // Update connection status
            function updateConnectionStatus() {
              const statusElement = document.querySelector('[data-status]');
              if (statusElement) {
                statusElement.textContent = navigator.onLine ? 'Online' : 'Offline';
                statusElement.className = navigator.onLine ? 'text-green-600' : 'text-red-600';
              }
            }

            // Check connection status periodically
            setInterval(updateConnectionStatus, 1000);
          `
        }}
      />
    </div>
  );
}