import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const UNIVERSITIES = [
  'Addis Ababa University (AAU)',
  'Bahir Dar University',
  'Hawassa University',
  'Jimma University',
  'Mekelle University',
  'Gondar University',
  'Wollo University',
  'Arba Minch University',
  'Haramaya University',
  'Dire Dawa University',
  'Adama Science & Technology University',
  'Debre Berhan University',
  'Wollega University',
  'Dilla University',
  'Wolkite University',
  'Other',
]

const STEPS = ['Stream & Campus', 'Personal Info', 'Payment & Receipt']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
              ${i < current ? 'bg-green-500 text-white' : i === current ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-900/40' : 'bg-white/10 text-slate-500'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${i === current ? 'text-blue-400' : 'text-slate-500'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-12 sm:w-16 h-0.5 mb-4 mx-1 transition-all duration-500 ${i < current ? 'bg-green-500' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function FormField({ label, type = 'text', value, onChange, placeholder, required, children }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children || (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-2.5 text-white text-sm placeholder-slate-500
            focus:outline-none focus:border-blue-500/70 focus:bg-white/10 transition-all"
        />
      )}
    </div>
  )
}

export default function EnrollmentModal({ isOpen, onClose }) {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const [form, setForm] = useState({
    stream: '',
    university: '',
    customUniversity: '',
    fullName: '',
    phone: '',
    email: '',
    password: '',
    receiptFile: null,
    receiptPreview: null,
  })

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setForm(prev => ({ ...prev, receiptFile: file, receiptPreview: preview }))
  }

  const validateStep = () => {
    setError('')
    if (step === 0) {
      if (!form.stream) return setError('Stream ይምረጡ'), false
      if (!form.university) return setError('University ይምረጡ'), false
      if (form.university === 'Other' && !form.customUniversity.trim())
        return setError('University ስም ያስፈልጋል'), false
    }
    if (step === 1) {
      if (!form.fullName.trim())  return setError('ሙሉ ስም ያስፈልጋል'), false
      if (!form.phone.trim())     return setError('ስልክ ቁጥር ያስፈልጋል'), false
      if (!/^(\+251|09|07)\d{8,9}$/.test(form.phone.replace(/\s/g, '')))
        return setError('ትክክለኛ Ethiopian ስልክ ቁጥር ያስፈልጋል (e.g. 0912345678)'), false
      if (!form.email.trim())     return setError('ኢሜይል ያስፈልጋል'), false
      if (!/\S+@\S+\.\S+/.test(form.email)) return setError('ትክክለኛ ኢሜይል ያስፈልጋል'), false
      if (form.password.length < 6) return setError('የይለፍ ቃሉ ቢያንስ 6 ፊደላት ያስፈልጋሉ'), false
    }
    if (step === 2) {
      if (!form.receiptFile) return setError('የደረሰኝ ስእል ወይም PDF ያስፈልጋል'), false
    }
    return true
  }

  const nextStep = () => { if (validateStep()) setStep(s => s + 1) }
  const prevStep = () => { setError(''); setStep(s => s - 1) }

  const handleSubmit = async () => {
    if (!validateStep()) return
    setSubmitting(true)
    setError('')

    try {
      // Convert receipt to base64
      let receiptBase64 = null
      if (form.receiptFile) {
        receiptBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(form.receiptFile)
        })
      }

      const universityName = form.university === 'Other' ? form.customUniversity : form.university

      // 1. Register the user
      const regResult = await register({
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phone,
        password: form.password,
        role: 'student',
        educationLevel: `${form.stream} — ${universityName}`,
      })

      if (!regResult.success) {
        setError(regResult.error || 'ምዝገባ አልተሳካም')
        setSubmitting(false)
        return
      }

      // 2. Submit manual payment receipt
      const token = localStorage.getItem('authToken')
      if (token && receiptBase64) {
        const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:5000/api' : '/api'

        await fetch(`${API_BASE}/payments/manual-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            amount: 0,
            receiptImage: receiptBase64,
            receiptFileName: form.receiptFile.name,
            plan: `${form.stream} — ${universityName}`,
          }),
        })
      }

      setSubmitted(true)
    } catch (err) {
      setError('ስህተት ተከስቷል። እንደገና ይሞክሩ።')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(0); setError(''); setSubmitted(false)
    setForm({ stream: '', university: '', customUniversity: '', fullName: '', phone: '', email: '', password: '', receiptFile: null, receiptPreview: null })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/20 border-b border-white/8 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">🎓 ምዝገባ ይጀምሩ</h2>
            <p className="text-xs text-slate-400 mt-0.5">Alpha Freshman Tutorial</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-slate-400 hover:text-white transition-all">✕</button>
        </div>

        <div className="px-6 py-6 max-h-[75vh] overflow-y-auto">
          {/* Success State */}
          {submitted ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-black text-white mb-3">ምዝገባዎ ተቀብሏል!</h3>
              <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-2xl p-4 mb-6 text-sm text-yellow-300 leading-relaxed">
                የላኩት የባንክ ደረሰኝ በአድሚን እየተረጋገጠ ነው፤<br />
                እንደተረጋገጠ የቪዲዮ እና የ PDF ማስታወሻዎች ይከፈቱልዎታል።
              </div>
              <button onClick={() => { handleClose(); navigate('/dashboard') }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all">
                ዳሽቦርድ ይሂዱ →
              </button>
            </div>
          ) : (
            <>
              <StepIndicator current={step} />

              {/* Error Banner */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span><span>{error}</span>
                </div>
              )}

              {/* Step 0: Stream & Campus */}
              {step === 0 && (
                <div>
                  <h3 className="font-bold text-white mb-4">ስትሪምና ዩኒቨርሲቲ ይምረጡ</h3>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Stream <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Natural Science', 'Social Science'].map(s => (
                        <button key={s} onClick={() => setForm(p => ({ ...p, stream: s }))}
                          className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all
                            ${form.stream === s
                              ? 'border-blue-500/60 bg-blue-500/20 text-blue-300'
                              : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/8'}`}>
                          {s === 'Natural Science' ? '🔬' : '📚'} {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <FormField label="University / Campus" required>
                    <select value={form.university} onChange={set('university')}
                      className="w-full bg-white/6 border border-white/12 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/70 transition-all">
                      <option value="" className="bg-slate-800">— ዩኒቨርሲቲ ይምረጡ —</option>
                      {UNIVERSITIES.map(u => (
                        <option key={u} value={u} className="bg-slate-800">{u}</option>
                      ))}
                    </select>
                  </FormField>

                  {form.university === 'Other' && (
                    <FormField label="የዩኒቨርሲቲ ስም" required
                      value={form.customUniversity} onChange={set('customUniversity')}
                      placeholder="ዩኒቨርሲቲዎን ይጻፉ" />
                  )}
                </div>
              )}

              {/* Step 1: Personal Info */}
              {step === 1 && (
                <div>
                  <h3 className="font-bold text-white mb-4">የግል መረጃ</h3>
                  <FormField label="ሙሉ ስም" required value={form.fullName} onChange={set('fullName')} placeholder="ሙሉ ስምዎን ያስፈልጋሉ" />
                  <FormField label="ስልክ ቁጥር (ለደረሰኝ ማረጋገጫ)" type="tel" required value={form.phone} onChange={set('phone')} placeholder="09... ወይም +251..." />
                  <FormField label="ኢሜይል አድራሻ" type="email" required value={form.email} onChange={set('email')} placeholder="example@gmail.com" />
                  <FormField label="የይለፍ ቃል" type="password" required value={form.password} onChange={set('password')} placeholder="ቢያንስ 6 ፊደላት" />

                  {/* Summary chip */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-300 mt-2">
                    📌 Stream: <strong>{form.stream}</strong> · {form.university === 'Other' ? form.customUniversity : form.university}
                  </div>
                </div>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <div>
                  <h3 className="font-bold text-white mb-4">💳 ክፍያ መረጃ</h3>

                  {/* Payment Instructions */}
                  <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-500/20 rounded-2xl p-4 mb-5">
                    <div className="text-xs font-bold text-green-400 uppercase tracking-wide mb-3">📋 የክፍያ መረጃ</div>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between items-center py-2 border-b border-white/8">
                        <span className="text-slate-400">🏦 CBE Account</span>
                        <button onClick={() => navigator.clipboard?.writeText('1000123456789')}
                          className="font-mono font-bold text-white hover:text-green-400 transition-colors text-right">
                          1000123456789
                        </button>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-white/8">
                        <span className="text-slate-400">👤 Account Name</span>
                        <span className="font-semibold text-white">Alpha Freshman Tutorial</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-400">📱 Telebirr</span>
                        <button onClick={() => navigator.clipboard?.writeText('0912345678')}
                          className="font-mono font-bold text-white hover:text-green-400 transition-colors">
                          0912345678
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-400/80 mt-3">
                      ⚠️ ስልክ ቁጥርዎን ({form.phone}) ለደረሰኙ ማብራሪያ (reference) ይጠቀሙ።
                    </p>
                  </div>

                  {/* File Upload */}
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      የደረሰኝ ፎቶ <span className="text-red-400">*</span>
                    </label>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                    <button onClick={() => fileRef.current?.click()}
                      className={`w-full border-2 border-dashed rounded-2xl py-6 px-4 text-center transition-all
                        ${form.receiptFile ? 'border-green-500/40 bg-green-500/5' : 'border-white/15 bg-white/4 hover:border-blue-500/40 hover:bg-blue-500/5'}`}>
                      {form.receiptFile ? (
                        <div>
                          {form.receiptPreview && (
                            <img src={form.receiptPreview} alt="Receipt preview"
                              className="h-28 mx-auto rounded-lg mb-2 object-contain" />
                          )}
                          <p className="text-green-400 font-semibold text-sm">✅ {form.receiptFile.name}</p>
                          <p className="text-slate-500 text-xs mt-1">ለመቀየር ጠቅ ያድርጉ</p>
                        </div>
                      ) : (
                        <div>
                          <div className="text-3xl mb-2">📸</div>
                          <p className="text-slate-300 font-semibold text-sm">ደረሰኝ ፎቶ ወይም PDF ይስቀሉ</p>
                          <p className="text-slate-500 text-xs mt-1">.jpg, .png, .pdf · ሙቀጫ ጠቅ ያድርጉ</p>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-6">
                {step > 0 && (
                  <button onClick={prevStep}
                    className="flex-1 py-3 rounded-xl border border-white/15 text-slate-300 font-semibold hover:bg-white/8 transition-all">
                    ← ወደ ኋላ
                  </button>
                )}
                {step < 2 ? (
                  <button onClick={nextStep}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-900/30">
                    ቀጥል →
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/30">
                    {submitting ? '⏳ እየተላከ...' : '✅ ምዝገባ ያጠናቅቁ'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
