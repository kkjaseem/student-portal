import { useLocation, useNavigate } from 'react-router-dom'
import StepIndicator from '../components/StepIndicator.jsx'
import { useState } from 'react'

const DOCUMENT_TYPES = [
  { id: 'photo', label: 'Passport Photo', required: true, accept: 'image/*', hint: 'Recent passport-size photograph' },
  { id: 'marksheet10', label: '10th Marksheet', required: true, accept: '.pdf,image/*', hint: 'Class 10 certificate / marksheet' },
  { id: 'marksheet12', label: '12th Marksheet', required: true, accept: '.pdf,image/*', hint: 'Class 12 certificate / marksheet' },
  { id: 'graduation', label: 'Graduation Certificate', required: false, accept: '.pdf,image/*', hint: 'If applicable' },
]

export default function DocumentsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const applicationId = location.state?.applicationId

  const [files, setFiles] = useState({})

  const handleFileChange = (docId, file) => {
    setFiles(prev => ({ ...prev, [docId]: file }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const missing = DOCUMENT_TYPES.filter(d => d.required && !files[d.id])
    if (missing.length > 0) {
      alert(`Please upload required documents: ${missing.map(d => d.label).join(', ')}`)
      return
    }
    alert('Documents uploaded! Application submitted successfully.')
  }

  return (
    <div>
      <StepIndicator currentStep={2} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Documents Upload</h2>
          <p className="text-blue-200 text-sm mt-0.5">Upload supporting documents for your application</p>
        </div>

        {applicationId && (
          <div className="mx-6 mt-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ Application ID: <span className="font-mono font-semibold">{applicationId}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {DOCUMENT_TYPES.map((doc) => (
            <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-800">
                  {doc.label}
                  {doc.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {files[doc.id] && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {files[doc.id].name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">{doc.hint}</p>
              <input
                type="file"
                accept={doc.accept}
                onChange={(e) => handleFileChange(doc.id, e.target.files[0])}
                className="block w-full text-sm text-gray-500
                  file:mr-3 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 cursor-pointer" />
            </div>
          ))}

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/apply')}
              className="btn-secondary">
              ← Back
            </button>
            <button type="submit" className="btn-primary">
              Submit Application →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
