export default function StepIndicator({ currentStep }) {
  const steps = [
    { id: 1, label: 'Personal & Education Details' },
    { id: 2, label: 'Documents Upload' },
    { id: 3, label: 'Preview' },
    { id: 4, label: 'Payment' },
  ]

  return (
    <div className="flex items-center mb-6 bg-white rounded-lg border border-gray-200 px-4 py-3">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium
            ${currentStep === step.id
              ? 'bg-blue-800 text-white'
              : currentStep > step.id
                ? 'text-gray-500'
                : 'text-gray-400'
            }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
              ${currentStep === step.id
                ? 'bg-white text-blue-800'
                : currentStep > step.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
              {currentStep > step.id ? '✓' : step.id}
            </span>
            {step.label}
          </div>
          {index < steps.length - 1 && (
            <div className="w-8 h-px bg-gray-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}
