import { useEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export function DigiLockerModal({ redirectUrl, requestId, onClose, onVerified, onFailed }) {
  const [popupOpened, setPopupOpened] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const pollingRef = useRef(null)
  const popupRef   = useRef(null)

  // Open popup immediately on mount
  useEffect(() => {
    openPopup()
  }, [])

  // Poll every 2 seconds using full API URL
  useEffect(() => {
    if (!requestId) return

    const poll = async () => {
      try {
        const res  = await fetch(`${API_URL}/verification/status/${requestId}`)
        const data = await res.json()
        console.log('Poll status:', data.status, requestId)
        if (data.status === 'VERIFIED') {
          clearInterval(pollingRef.current)
          onVerified(data)
        } else if (data.status === 'FAILED') {
          clearInterval(pollingRef.current)
          onFailed(data.message)
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }

    // Poll immediately then every 2 seconds
    poll()
    pollingRef.current = setInterval(poll, 2000)
    return () => clearInterval(pollingRef.current)
  }, [requestId, onVerified, onFailed])

  useEffect(() => {
    return () => {
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close()
      }
    }
  }, [])

  const openPopup = () => {
    const width  = 900
    const height = 700
    const left   = window.screenX + (window.outerWidth  - width)  / 2
    const top    = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      redirectUrl,
      'DigiLocker_Verification',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    )

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setPopupBlocked(true)
      return
    }

    popupRef.current = popup
    setPopupOpened(true)
    setPopupBlocked(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden" style={{ width: 480, maxWidth: '95vw' }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <span className="font-semibold text-gray-900 text-[15px]">Aadhaar Verification</span>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-lg">
            ×
          </button>
        </div>

        <div className="px-8 py-10 flex flex-col items-center text-center gap-5">
          {popupBlocked ? (
            <>
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Popup Blocked</h3>
                <p className="text-sm text-gray-500">
                  Your browser blocked the DigiLocker popup. Please allow popups for this site and try again.
                </p>
              </div>
              <button onClick={openPopup}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2.5 rounded font-semibold text-sm transition-colors">
                Open DigiLocker Verification
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">DigiLocker Opened</h3>
                <p className="text-sm text-gray-500">
                  Complete the Aadhaar verification in the popup window. This dialog will update automatically.
                </p>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5 w-full">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                <p className="text-xs text-blue-600">Waiting for verification to complete...</p>
              </div>
              <button onClick={openPopup}
                className="text-sm text-blue-600 underline hover:text-blue-800">
                Reopen popup window
              </button>
            </>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secured by DigiLocker via IDfy
          </span>
          <span>
            <span className="font-bold text-gray-600">i</span>
            <span className="font-bold text-red-500">D</span>
            <span className="font-bold text-gray-600">fy</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export function SuccessPopup({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden" style={{ width: 320 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-900 text-sm">Aadhaar Verification</span>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-lg font-light">×</button>
        </div>
        <div className="px-6 py-7 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-md">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-green-600 font-bold text-[17px] mb-1.5">Aadhaar Verification Successful!</h3>
          <p className="text-gray-500 text-sm mb-6">Your details have been successfully verified.</p>
          <button onClick={onClose}
            className="w-full bg-blue-800 hover:bg-blue-900 text-white py-2.5 rounded font-semibold text-sm transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function FailurePopup({ message, hint, onClose, onRetry }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden" style={{ width: 320 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-900 text-sm">Aadhaar Verification</span>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-700 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-lg font-light">×</button>
        </div>
        <div className="px-6 py-7 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4 shadow-md">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-red-500 font-bold text-[15px] mb-1.5">Verification Failed</h3>
          <p className="text-gray-600 text-sm mb-4 leading-snug">{message}</p>
          <div className="w-full bg-red-50 border border-red-100 rounded-md px-3 py-2.5 mb-6 flex items-start gap-2 text-left">
            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-red-600 leading-snug">{hint}</p>
          </div>
          <div className="flex gap-2 w-full">
            <button onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded font-semibold text-sm hover:bg-gray-50 transition-colors">
              Close
            </button>
            <button onClick={onRetry}
              className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2.5 rounded font-semibold text-sm transition-colors">
              Retry Verification
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
