import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import StepIndicator from '../components/StepIndicator.jsx'
import { DigiLockerModal, SuccessPopup, FailurePopup } from '../components/VerificationModal.jsx'
import { initiateVerification, saveApplication } from '../api/index.js'
import { INDIAN_STATES } from '../utils/states.js'

const TITLE_OPTIONS = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof']
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']

function getFailureHint(message = '') {
  const m = message.toLowerCase()
  if (m.includes('name') && m.includes('state'))
    return 'Please ensure your name and State match your Aadhaar.'
  if (m.includes('name'))
    return 'Please ensure your name matches your Aadhaar.'
  if (m.includes('state'))
    return 'Please ensure the selected State matches your Aadhaar.'
  return 'Please ensure your details match your Aadhaar records.'
}

export default function ApplicationPage() {
  const navigate = useNavigate()

  // modal: null | 'digilocker' | 'success' | 'failure'
  const [modal, setModal] = useState(null)
  const [verif, setVerif] = useState({
    status: 'UNVERIFIED', // UNVERIFIED | LOADING | PENDING | VERIFIED | FAILED
    requestId: null,
    redirectUrl: null,
    message: '',
  })
  const [applicationId, setApplicationId] = useState(null)
  const [nextClicked, setNextClicked] = useState(false)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    mode: 'onBlur',
    defaultValues: {
      title: '', firstName: '', middleName: '', lastName: '',
      email: '', mobile: '', gender: '', dob: '',
      state: '', panNumber: '', aadhaarNumber: '',
    },
  })

  const watchedAadhaar = watch('aadhaarNumber') || ''
  const aadhaarIs12 = /^\d{12}$/.test(watchedAadhaar)
  const isVerified = verif.status === 'VERIFIED'
  const isLoading = verif.status === 'LOADING'

  // "Verify Aadhaar" inside field only visible when exactly 12 digits typed AND not yet verified
  const showVerifyLink = aadhaarIs12 && !isVerified && !isLoading

  // All 4 preconditions for the link to be clickable
  const [fn, ln, st] = watch(['firstName', 'lastName', 'state'])
  const canVerify = showVerifyLink && fn?.trim() && ln?.trim() && st?.trim()

  // ── Initiate ──────────────────────────────────────────────────
  const handleVerifyClick = async () => {
    if (!canVerify) return
    const vals = watch()
    setVerif(s => ({ ...s, status: 'LOADING', message: '' }))
    try {
      const res = await initiateVerification({
        applicationId: applicationId || undefined,
        firstName: vals.firstName, middleName: vals.middleName,
        lastName: vals.lastName, state: vals.state,
        aadhaarNumber: vals.aadhaarNumber,
      })
      if (res.applicationId) setApplicationId(res.applicationId)
      setVerif({ status: 'PENDING', requestId: res.requestId, redirectUrl: res.redirectUrl, message: '' })
      setModal('digilocker')
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to initiate verification.'
      setVerif({ status: 'FAILED', requestId: null, redirectUrl: null, message: msg })
      setModal('failure')
    }
  }

  const handleVerified = useCallback(() => {
    setModal('success')
    setVerif(s => ({ ...s, status: 'VERIFIED' }))
  }, [])

  const handleFailed = useCallback((message) => {
    setVerif(s => ({ ...s, status: 'FAILED', message: message || 'Verification failed.' }))
    setModal('failure')
  }, [])

  const handleRetry = () => {
    setModal(null)
    setVerif(s => ({ ...s, status: 'UNVERIFIED', message: '' }))
  }

  // ── Submit ─────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    setNextClicked(true)
    if (!isVerified) return // banner will show
    try {
      const res = await saveApplication({
        id: applicationId, title: data.title,
        firstName: data.firstName, middleName: data.middleName, lastName: data.lastName,
        email: data.email, mobile: data.mobile, gender: data.gender, dob: data.dob,
        state: data.state, panNumber: data.panNumber, aadhaarNumber: data.aadhaarNumber,
      })
      navigate('/apply/documents', { state: { applicationId: res.application?.id || applicationId } })
    } catch (err) {
      // stay on page, error shown in banner
    }
  }

  // ── Bottom note content ────────────────────────────────────────
  const noteIsRed = verif.status === 'FAILED' || (nextClicked && !isVerified)
  const noteText = isVerified
    ? 'You can now proceed to the next step.'
    : verif.status === 'FAILED' || (nextClicked && !isVerified)
      ? 'You must complete Aadhaar verification successfully to proceed to the next step.'
      : 'Please verify your Aadhaar to proceed to the next step.'

  return (
    <div>
      <StepIndicator currentStep={1} />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4">
        {/* Dark navy section header */}
        <div className="flex items-center justify-between bg-blue-900 px-5 py-3">
          <span className="text-white font-semibold text-sm tracking-wide">Personal Details</span>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5">

          {/* ── Row 1: Title | First Name | Middle Name | Last Name ── */}
          <div className="grid grid-cols-12 gap-x-4 gap-y-1 mb-5">
            <div className="col-span-2">
              <label className="form-label">Title <span className="text-red-500">*</span></label>
              <select {...register('title', { required: 'Required' })} className="form-input">
                <option value="">Select</option>
                {TITLE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
              {errors.title && <p className="form-error">{errors.title.message}</p>}
            </div>
            <div className="col-span-3">
              <label className="form-label">First Name <span className="text-red-500">*</span></label>
              <input {...register('firstName', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })}
                placeholder="First Name" className="form-input" />
              {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
            </div>
            <div className="col-span-3">
              <label className="form-label">Middle Name</label>
              <input {...register('middleName')} placeholder="Middle Name" className="form-input" />
            </div>
            <div className="col-span-4">
              <label className="form-label">Last Name <span className="text-red-500">*</span></label>
              <input {...register('lastName', { required: 'Required', minLength: { value: 2, message: 'Min 2 chars' } })}
                placeholder="Last Name" className="form-input" />
              {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* ── Row 2: Email | Mobile | Gender | DOB ── */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-1 mb-5">
            <div>
              <label className="form-label">Email <span className="text-red-500">*</span></label>
              <input type="email"
                {...register('email', {
                  required: 'Required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                })}
                placeholder="email@example.com" className="form-input" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="form-label">Mobile Number <span className="text-red-500">*</span></label>
              <div className="flex">
                <span className="inline-flex items-center gap-1 px-2.5 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-xs text-gray-600 whitespace-nowrap select-none">
                  🇮🇳 +91
                </span>
                <input type="tel"
                  {...register('mobile', {
                    required: 'Required',
                    pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit number' },
                  })}
                  placeholder="10-digit number" maxLength={10}
                  className="form-input rounded-l-none" />
              </div>
              {errors.mobile && <p className="form-error">{errors.mobile.message}</p>}
            </div>
            <div>
              <label className="form-label">Gender <span className="text-red-500">*</span></label>
              <select {...register('gender', { required: 'Required' })} className="form-input">
                <option value="">Select</option>
                {GENDER_OPTIONS.map(g => <option key={g}>{g}</option>)}
              </select>
              {errors.gender && <p className="form-error">{errors.gender.message}</p>}
            </div>
            <div>
              <label className="form-label">Date of Birth <span className="text-red-500">*</span></label>
              <input type="date" {...register('dob', { required: 'Required' })} className="form-input" />
              {errors.dob && <p className="form-error">{errors.dob.message}</p>}
            </div>
          </div>

          {/* ── Row 3: State | PAN | Aadhaar ── */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-6">
            <div>
              <label className="form-label">State <span className="text-red-500">*</span></label>
              <select {...register('state', { required: 'Required' })} className="form-input">
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
              {errors.state && <p className="form-error">{errors.state.message}</p>}
            </div>

            <div>
              <label className="form-label">PAN Card Number <span className="text-red-500">*</span></label>
              <input
                {...register('panNumber', {
                  pattern: { value: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'E.g. ABCDE1234F' },
                })}
                placeholder="E.G. AKUPC2694J" maxLength={10}
                className="form-input uppercase" />
              {errors.panNumber && <p className="form-error">{errors.panNumber.message}</p>}
            </div>

            {/* ── Aadhaar field with inline Verify link ── */}
            <div>
              <label className="form-label">Aadhaar Number <span className="text-red-500">*</span></label>

              {/* The input + inline verify button as one bordered unit */}
              <div className={`flex items-center rounded-md border bg-white overflow-hidden
                ${isVerified
                  ? 'border-green-400 ring-1 ring-green-300'
                  : 'border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
                }`}>
                <input
                  type="password"          /* shows dots like screenshot */
                  inputMode="numeric"
                  {...register('aadhaarNumber', {
                    required: 'Aadhaar number is required',
                    pattern: { value: /^\d{12}$/, message: 'Must be exactly 12 digits' },
                  })}
                  placeholder="Enter 12-digit Aadhaar"
                  maxLength={12}
                  disabled={isVerified}
                  className="flex-1 px-3 py-2 text-sm outline-none bg-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                />

                {/* Right side of input — contextual */}
                <div className="pr-3 flex items-center gap-1.5 flex-shrink-0">
                  {isVerified && (
                    /* Green tick + "Aadhaar Verified" text inside field */
                    <span className="flex items-center gap-1 text-green-600 text-xs font-semibold whitespace-nowrap">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd" />
                      </svg>
                      Verify Aadhaar
                    </span>
                  )}

                  {isLoading && (
                    <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}

                  {showVerifyLink && !isLoading && (
                    /* "Verify Aadhaar ✓" inline link — matches screenshot blue link + green check icon */
                    <button
                      type="button"
                      onClick={canVerify ? handleVerifyClick : undefined}
                      title={!canVerify ? 'Fill First Name, Last Name, and State first' : 'Click to verify via DigiLocker'}
                      className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap transition-colors
                        ${canVerify
                          ? 'text-blue-600 hover:text-blue-800 cursor-pointer'
                          : 'text-gray-400 cursor-not-allowed'
                        }`}>
                      Verify Aadhaar
                      <svg className={`w-4 h-4 ${canVerify ? 'text-green-500' : 'text-gray-300'}`}
                        fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Helper text below field */}
              {errors.aadhaarNumber ? (
                <p className="form-error">{errors.aadhaarNumber.message}</p>
              ) : isVerified ? null : (
                <p className={`text-xs mt-1 ${aadhaarIs12 && !canVerify ? 'text-amber-500' : 'text-green-600'}`}>
                  {aadhaarIs12
                    ? canVerify
                      ? 'Click "Verify Aadhaar" to proceed.'
                      : 'Fill First Name, Last Name and State to enable verification.'
                    : 'Verify Aadhaar will appear after entering 12 digits'}
                </p>
              )}
            </div>
          </div>

          {/* Next button — centered like screenshot */}
          <div className="flex justify-center pt-1">
            <button type="submit" disabled={isSubmitting}
              className="btn-primary px-12">
              {isSubmitting ? 'Saving...' : 'Next'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Bottom note banner ── */}
      <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm border
        ${isVerified
          ? 'bg-green-50 border-green-200 text-green-700'
          : noteIsRed
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
        <svg className={`w-4 h-4 flex-shrink-0 ${isVerified ? 'text-green-500' : noteIsRed ? 'text-red-400' : 'text-blue-500'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd" />
        </svg>
        <p>
          {!isVerified && !noteIsRed && <strong className="font-semibold">Note: </strong>}
          {noteText}
        </p>
      </div>

      {/* Important Notes box — shown below form like screenshot */}
      <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-gray-600">
        <p className="font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd" />
          </svg>
          Important Notes
        </p>
        <ul className="space-y-1 list-disc list-inside text-gray-500">
          <li>"Verify Aadhaar" appears inside the Aadhaar Number field only after entering 12 digits.</li>
          <li>The button is enabled only when First Name, Last Name, State and Aadhaar Number are entered.</li>
          <li>Aadhaar details are not displayed in success or failure popups.</li>
        </ul>
      </div>

      {/* ── Modals ── */}
      {modal === 'digilocker' && verif.redirectUrl && (
        <DigiLockerModal
          redirectUrl={verif.redirectUrl}
          requestId={verif.requestId}
          onClose={() => {
            setModal(null)
            if (verif.status === 'PENDING')
              setVerif(s => ({ ...s, status: 'UNVERIFIED' }))
          }}
          onVerified={handleVerified}
          onFailed={handleFailed}
        />
      )}

      {modal === 'success' && (
        <SuccessPopup onClose={() => setModal(null)} />
      )}

      {modal === 'failure' && (
        <FailurePopup
          message={verif.message}
          hint={getFailureHint(verif.message)}
          onClose={() => setModal(null)}
          onRetry={handleRetry}
        />
      )}
    </div>
  )
}
