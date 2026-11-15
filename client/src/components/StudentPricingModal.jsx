import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Ideal for testing your resume against a single job posting.",
    badge: "Basic",
    badgeColor: "bg-gray-800 text-gray-300 border-gray-700",
    features: [
      "3 Instant Free Scans",
      "Overall Job Match Score",
      "Top 3 Missing Skill Gaps",
      "Standard Fresher Template",
      "Basic Formatting Warnings"
    ],
    buttonText: "Current Plan",
    buttonDisabled: true,
    highlight: false
  },
  {
    id: "sprint_pass",
    name: "Sprint Pass",
    price: "₹199",
    period: "14 days access",
    description: "Unlimited power for active campus placement drives and walk-ins.",
    badge: "Most Popular",
    badgeColor: "bg-indigo-900/60 text-indigo-300 border-indigo-500/40",
    features: [
      "Unlimited Resume Scans",
      "Grounded AI Bullet Rewriter",
      "1-Click Job Tailoring & Versions",
      "4 ATS-Safe Fresher Templates",
      "Dual PDF & Word (DOCX) Export",
      "No Auto-Renewal (One-Time Pay)"
    ],
    buttonText: "Get Sprint Pass (₹199)",
    buttonDisabled: false,
    highlight: true
  },
  {
    id: "placement_season",
    name: "Placement Season",
    price: "₹499",
    period: "3 months (90 days)",
    description: "Complete peace of mind for your entire final year placement semester.",
    badge: "Best Value",
    badgeColor: "bg-amber-900/60 text-amber-300 border-amber-500/40",
    features: [
      "Everything in Sprint Pass",
      "Full 90-Day Semester Coverage",
      "Job Application Tracking",
      "Role-Based Skill Roadmaps",
      "Priority AI Queue & Support",
      "No Auto-Renewal (One-Time Pay)"
    ],
    buttonText: "Get Season Pass (₹499)",
    buttonDisabled: false,
    highlight: false
  }
];

export default function StudentPricingModal({
  isOpen,
  onClose,
  token,
  userEmail = '',
  isPremium = false,
  onUpgradeSuccess,
  API_URL = '',
  initialTab = 'pricing' // 'pricing' or 'referral'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loadingPlan, setLoadingPlan] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [referralData, setReferralData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen || !token) return;

    const fetchReferralStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/referrals/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res?.data?.status === 'success') {
          setReferralData(res.data);
        }
      } catch (err) {
        console.error("Failed to load referral stats:", err);
      }
    };

    fetchReferralStats();
  }, [isOpen, token, API_URL]);

  if (!isOpen) return null;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (planId) => {
    if (!token) {
      setError("Please sign in or create an account to activate your pass.");
      return;
    }

    setLoadingPlan(planId);
    setError('');
    setSuccessMsg('');

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/billing/order`, { plan_id: planId }, { headers });

      // Handle Mock Upgrade Path (Development / Testing without keys)
      if (res.data.status === 'mock') {
        const confirmMock = window.confirm(
          `Razorpay test credentials not configured in environment.\n\nProceed with instant Mock Upgrade to activate ${planId === 'placement_season' ? 'Placement Season Pass (90 days)' : 'Sprint Pass (14 days)'}?`
        );
        if (confirmMock) {
          const mockRes = await axios.post(`${API_URL}/api/billing/mock-upgrade`, { plan_id: planId }, { headers });
          if (mockRes.data.status === 'success') {
            setSuccessMsg("🎉 Congratulations! Your Student Pass is now active!");
            if (onUpgradeSuccess) onUpgradeSuccess();
            setTimeout(() => {
              onClose();
            }, 1800);
          }
        }
        return;
      }

      // Handle Live Razorpay Checkout
      if (res.data.status === 'success' && res.data.order_id) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setError("Failed to load Razorpay SDK. Please check your internet connection.");
          return;
        }

        const options = {
          key: res.data.key_id,
          amount: res.data.amount,
          currency: res.data.currency || 'INR',
          name: 'ResuMatch AI',
          description: planId === 'placement_season' ? 'Placement Season Pass (₹499 / 90 days)' : 'Sprint Pass (₹199 / 14 days)',
          order_id: res.data.order_id,
          prefill: {
            email: userEmail || undefined
          },
          theme: {
            color: '#4F46E5'
          },
          handler: async function (response) {
            try {
              const verifyRes = await axios.post(`${API_URL}/api/billing/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: planId
              }, { headers });

              if (verifyRes.data.status === 'success') {
                setSuccessMsg("🎉 Payment successful! Your Student Pass is active.");
                if (onUpgradeSuccess) onUpgradeSuccess();
                setTimeout(() => {
                  onClose();
                }, 1800);
              }
            } catch (vErr) {
              console.error("Payment verification failed:", vErr);
              setError("Payment was captured by Razorpay, but verification failed. Please contact support.");
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error("Order initiation failed:", err);
      const msg = err.response?.data?.detail;
      setError(typeof msg === 'string' ? msg : "Failed to initiate payment. Please try again.");
    } finally {
      setLoadingPlan('');
    }
  };

  const handleCopyReferral = () => {
    if (referralData?.share_url && navigator.clipboard) {
      navigator.clipboard.writeText(referralData.share_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const shareText = referralData?.referral_code
    ? `Hey! Check out ResuMatch AI to get an ATS-compliant resume and job match score for campus drives. Use my student link: ${referralData.share_url}`
    : "Check out ResuMatch AI for campus placement resume matching!";
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl bg-[#0F172A] border border-indigo-500/30 rounded-3xl p-6 md:p-8 shadow-2xl text-white space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <span>🎓</span> Student Micro-Pricing • No Recurring Traps
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Built for Freshers. Priced for Students.
          </h2>
          <p className="text-xs md:text-sm text-gray-400">
            No expensive US subscriptions. Pay once with UPI and get full access during your active placement window.
          </p>

          {/* Tab Switcher: Pricing vs Referral */}
          <div className="inline-flex p-1 bg-gray-900 border border-gray-800 rounded-xl mt-3">
            <button
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'pricing'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>💳</span> Passes & Pricing
            </button>
            <button
              onClick={() => setActiveTab('referral')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'referral'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>🎁</span> Refer & Earn (Free Days)
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs text-center">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs text-center font-bold">
            {successMsg}
          </div>
        )}

        {/* TAB 1: PRICING PLANS */}
        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-5 border flex flex-col justify-between transition relative ${
                    plan.highlight
                      ? 'bg-gradient-to-b from-[#1E1B4B] to-[#0F172A] border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                        Recommended for Drives
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${plan.badgeColor}`}>
                          {plan.badge}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{plan.price}</span>
                        <span className="text-xs text-gray-400">/ {plan.period}</span>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed min-h-[32px]">
                        {plan.description}
                      </p>

                      <ul className="space-y-2 pt-2 border-t border-gray-800/80 text-xs text-gray-300">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-indigo-400 font-bold">✓</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6">
                      {plan.id === 'free' ? (
                        <button
                          disabled
                          className="w-full py-2.5 rounded-xl bg-gray-800/50 text-gray-500 text-xs font-bold cursor-default border border-gray-800"
                        >
                          {isPremium ? "Free Tier" : "Your Active Plan"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckout(plan.id)}
                          disabled={loadingPlan === plan.id}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
                            plan.highlight
                              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25'
                              : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                          }`}
                        >
                          {loadingPlan === plan.id ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : (
                            plan.buttonText
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* UPI Callout & Campus License */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-gray-900/60 border border-gray-800 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div className="text-xs">
                  <div className="font-bold text-white">Instant UPI One-Tap Checkout</div>
                  <div className="text-gray-400 text-[11px]">Pay seamlessly with Google Pay, PhonePe, Paytm, or UPI QR.</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-2xl">🏛️</span>
                  <div>
                    <div className="font-bold text-indigo-300">College Placement Cells & TPOs</div>
                    <div className="text-gray-400 text-[11px]">Bulk student passes available from ₹99/student.</div>
                  </div>
                </div>
                <a 
                  href="mailto:campus@resumatch.io?subject=Campus%20License%20Inquiry" 
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline whitespace-nowrap"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIRAL REFERRAL ENGINE */}
        {activeTab === 'referral' && (
          <div className="space-y-6 max-w-xl mx-auto py-2">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-gray-900 border border-purple-500/30 space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-3xl">
                🎁
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  Invite 3 Friends → Get 7 Days Free!
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Help your batchmates get placement-ready resumes. When 3 friends sign up with your link, you automatically unlock 7 days of free Sprint Pass access.
                </p>
              </div>

              {/* Progress Tracker */}
              <div className="bg-gray-900/80 p-4 rounded-2xl border border-gray-800 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Current Milestone Progress</span>
                  <span className="text-purple-300 font-bold">
                    {referralData ? referralData.pending_towards_next : 0} / 3 Friends
                  </span>
                </div>

                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, (((referralData?.pending_towards_next || 0) / 3) * 100))}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Total Friends Joined: <strong className="text-white">{referralData?.total_referrals || 0}</strong></span>
                  <span>Days Earned: <strong className="text-emerald-400">{referralData?.days_earned || 0} days</strong></span>
                </div>
              </div>

              {/* Referral Code & Share Link */}
              <div className="space-y-3 text-left">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                  Your Unique Referral Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={referralData?.share_url || `https://resumatch.io/?ref=${referralData?.referral_code || '...'}`}
                    className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-xs font-mono text-gray-300 select-all"
                  />
                  <button
                    onClick={handleCopyReferral}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span>{copiedLink ? '✓' : '📋'}</span> {copiedLink ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                >
                  <span>💬</span> Share on WhatsApp College Groups
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
