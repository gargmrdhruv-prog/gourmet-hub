import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Mail, Loader2, ShieldCheck, ArrowLeft, LockKeyhole, MailCheck, Hash } from 'lucide-react';

const SuperAdminLogin = () => {
  const [view, setView] = useState('login'); // 'login', 'reset_pass', 'update_email'
  
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Reset/Update States
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  
  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 🚨 MASTER SECRETS 🚨
  const SECRET_RECOVERY_KEY = "GOURMET-MASTER-2026"; // Hamesha same rahegi

  // Dynamic Getters (LocalStorage se uthayega warna default dega)
  const getMasterEmail = () => localStorage.getItem('master_email') || "founder@gourmet.com";
  const getMasterPassword = () => localStorage.getItem('master_password') || "Admin@123";

  // --- 1. LOGIN HANDLER ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    setTimeout(() => {
      if (email === getMasterEmail() && password === getMasterPassword()) {
        localStorage.setItem('super_admin_auth', 'true');
        window.location.href = '/super-admin'; 
      } else {
        setError("Access Denied: Invalid Master Credentials.");
        setLoading(false);
      }
    }, 1000);
  };

  // --- 2. PASSWORD RESET HANDLER ---
  const handlePasswordReset = (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    setTimeout(() => {
      if (recoveryKey !== SECRET_RECOVERY_KEY) {
        setError("Invalid Secret Recovery Key.");
      } else if (newPassword.length < 6) {
        setError("New password must be at least 6 characters.");
      } else {
        localStorage.setItem('master_password', newPassword);
        setSuccess("Master Password has been securely updated!");
        setTimeout(() => resetToLogin(), 2000);
      }
      setLoading(false);
    }, 1200);
  };

  // --- 3. SEND OTP (EMAIL UPDATE) ---
  const handleSendOtp = (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    setTimeout(() => {
      if (recoveryKey !== SECRET_RECOVERY_KEY) {
        setError("Invalid Secret Recovery Key.");
        setLoading(false);
        return;
      }
      
      // Generate 6 digit random OTP
      const freshOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(freshOtp);
      setOtpSent(true);
      
      // 🚨 MOCK EMAIL SENDING 🚨
      // Production mein yahan SendGrid ya Resend API call aayegi
      alert(`[SIMULATED EMAIL] \n\nTo: ${newEmail} \nSubject: Verify Master Email \n\nYour Verification Code is: ${freshOtp}`);
      
      setSuccess("Verification code sent to your new email!");
      setLoading(false);
    }, 1500);
  };

  // --- 4. VERIFY OTP & SAVE EMAIL ---
  const handleVerifyAndUpdateEmail = (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    setTimeout(() => {
      if (enteredOtp === generatedOtp) {
        localStorage.setItem('master_email', newEmail);
        setSuccess("Master Email has been successfully verified and updated!");
        setTimeout(() => resetToLogin(), 2000);
      } else {
        setError("Incorrect Verification Code. Try again.");
      }
      setLoading(false);
    }, 1000);
  };

  const resetToLogin = () => {
    setView('login');
    setPassword(''); setNewPassword(''); setNewEmail(''); setRecoveryKey('');
    setOtpSent(false); setEnteredOtp(''); setGeneratedOtp('');
    setSuccess(''); setError('');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900/80 to-transparent"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/20 mb-6">
          <ShieldCheck size={32} className="text-white" />
        </div>
        <h2 className="text-center text-3xl font-serif font-black italic text-white tracking-tight">Master Control</h2>
        <p className="mt-2 text-center text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">
          {view === 'login' ? 'Super Admin Authorization' : 'Credentials Security Hub'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl rounded-[2rem] sm:px-10 border border-slate-800 transition-all duration-500">
          
          {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-xl text-xs font-bold text-center border border-red-500/20 mb-6 flex items-center justify-center gap-2 animate-in fade-in"><ShieldAlert size={16} /> {error}</div>}
          {success && <div className="bg-green-500/10 text-green-500 p-4 rounded-xl text-xs font-bold text-center border border-green-500/20 mb-6 flex items-center justify-center gap-2 animate-in fade-in"><ShieldCheck size={16} /> {success}</div>}

          {/* --- LOGIN VIEW --- */}
          {view === 'login' && (
            <form className="space-y-6 animate-in fade-in slide-in-from-bottom-4" onSubmit={handleLogin}>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Master Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Mail size={18} /></div>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 pl-12 pr-4 font-bold text-white outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder:text-slate-700" placeholder="e.g. founder@gourmet.com" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Security Key</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><KeyRound size={18} /></div>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 pl-12 pr-4 font-bold text-white outline-none focus:ring-2 focus:ring-red-500 transition-all placeholder:text-slate-700" placeholder="••••••••" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/20 hover:from-red-500 hover:to-orange-500 flex justify-center items-center gap-2 transition-all active:scale-95 border border-red-500/50">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Authorize Access'}
              </button>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button type="button" onClick={() => { setView('update_email'); setError(''); setSuccess(''); }} className="text-[10px] font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">
                  Update Email ID
                </button>
                <button type="button" onClick={() => { setView('reset_pass'); setError(''); setSuccess(''); }} className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider">
                  Forgot Password?
                </button>
              </div>
            </form>
          )}

          {/* --- UPDATE EMAIL VIEW (OTP FLOW) --- */}
          {view === 'update_email' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
              {!otpSent ? (
                // STEP 1: ENTER KEY & NEW EMAIL
                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Secret Recovery Key</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><LockKeyhole size={18} /></div>
                      <input type="text" required value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 pl-12 pr-4 font-bold text-orange-500 outline-none focus:ring-2 focus:ring-red-500 uppercase" placeholder="ENTER SECRET KEY" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Enter Your New Master Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><MailCheck size={18} /></div>
                      <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 pl-12 pr-4 font-bold text-white outline-none focus:ring-2 focus:ring-red-500" placeholder="your.name@domain.com" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={resetToLogin} className="w-1/4 bg-slate-800 text-white py-4 rounded-xl flex justify-center items-center hover:bg-slate-700 transition-all"><ArrowLeft size={18} /></button>
                    <button type="submit" disabled={loading} className="w-3/4 bg-red-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 flex justify-center items-center">
                      {loading ? <Loader2 className="animate-spin" size={16} /> : 'Send OTP Code'}
                    </button>
                  </div>
                </form>
              ) : (
                // STEP 2: VERIFY OTP
                <form onSubmit={handleVerifyAndUpdateEmail} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Enter 6-Digit Code sent to<br/><span className="text-white text-sm">{newEmail}</span></label>
                    <div className="relative mt-4">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Hash size={18} /></div>
                      <input type="text" required maxLength="6" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 pl-12 pr-4 font-black text-2xl text-center text-white outline-none focus:ring-2 focus:ring-red-500 tracking-[0.5em]" placeholder="000000" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setOtpSent(false)} className="w-1/4 bg-slate-800 text-white py-4 rounded-xl flex justify-center items-center hover:bg-slate-700 transition-all"><ArrowLeft size={18} /></button>
                    <button type="submit" disabled={loading} className="w-3/4 bg-green-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-500 flex justify-center items-center">
                      {loading ? <Loader2 className="animate-spin" size={16} /> : 'Verify & Save Email'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* --- PASSWORD RESET VIEW --- */}
          {view === 'reset_pass' && (
            <form className="space-y-6 animate-in fade-in slide-in-from-right-4" onSubmit={handlePasswordReset}>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Secret Recovery Key</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><LockKeyhole size={18} /></div>
                  <input type="text" required value={recoveryKey} onChange={(e) => setRecoveryKey(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 pl-12 pr-4 font-bold text-orange-500 outline-none focus:ring-2 focus:ring-red-500 uppercase" placeholder="ENTER SECRET KEY" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Set New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><KeyRound size={18} /></div>
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black/50 border border-slate-800 rounded-xl py-4 pl-12 pr-4 font-bold text-white outline-none focus:ring-2 focus:ring-red-500" placeholder="Create new password" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={resetToLogin} className="w-1/4 bg-slate-800 text-white py-4 rounded-xl flex justify-center items-center hover:bg-slate-700 transition-all"><ArrowLeft size={18} /></button>
                <button type="submit" disabled={loading} className="w-3/4 bg-red-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 flex justify-center items-center">
                  {loading ? <Loader2 className="animate-spin" size={16} /> : 'Update Password'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default SuperAdminLogin;