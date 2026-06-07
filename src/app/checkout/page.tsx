'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/hooks/useAuth';
import { useUserLocation } from '@/hooks/useUserLocation';
import {
  collection, addDoc, Timestamp, doc, updateDoc, increment, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import {
  ShoppingBag, CheckCircle, Truck, MapPin, Mail, User, Leaf,
  ArrowLeft, Sparkles, Package, CreditCard, Navigation,
  Loader2, ChevronRight, Gift, Smartphone, Banknote,
  Copy, Check, AlertCircle, Shield, Lock, Phone,
  Receipt, Zap, ExternalLink,
} from 'lucide-react';
import { initDeliveryTracking, getEstimatedDeliveryDate } from '@/lib/deliveryTracking';

/* ─────────────────────────────────────────────
   Styles injectés globalement (Tailwind ne suffit pas ici)
───────────────────────────────────────────── */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

  :root {
    --ivory:   #FAFAF8;
    --white:   #FFFFFF;
    --gold:    #C9A96E;
    --gold-lt: #E8D5B0;
    --ink:     #1A1A1A;
    --ink-md:  #4A4A4A;
    --ink-lt:  #9A9A9A;
    --border:  rgba(201,169,110,0.18);
    --shadow:  0 4px 40px rgba(26,26,26,0.06);
    --shadow-lg: 0 16px 64px rgba(26,26,26,0.10);
  }

  .checkout-root * { font-family: 'DM Sans', sans-serif; }
  .checkout-root { background: var(--ivory); min-height: 100vh; }

  .serif { font-family: 'Cormorant Garamond', Georgia, serif; }

  /* card glass */
  .card {
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: box-shadow 0.3s ease;
  }
  .card:hover { box-shadow: var(--shadow-lg); }

  /* card header */
  .card-header {
    padding: 20px 28px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .card-header-title {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-md);
  }
  .card-header-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--gold);
    flex-shrink: 0;
  }

  .card-body { padding: 24px 28px; }

  /* info row */
  .info-row {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    background: var(--ivory);
    border-radius: 12px;
    border: 1px solid transparent;
    transition: border-color 0.2s;
  }
  .info-row:hover { border-color: var(--border); }
  .info-row-label { font-size: 11px; color: var(--ink-lt); letter-spacing: 0.06em; text-transform: uppercase; }
  .info-row-value { font-size: 14px; color: var(--ink); font-weight: 500; margin-top: 2px; }

  /* icon circle */
  .icon-circle {
    width: 38px; height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--gold-lt), var(--gold));
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    color: white;
  }

  /* payment option */
  .pay-option {
    display: flex; align-items: center; gap: 16px;
    padding: 18px 20px;
    border-radius: 14px;
    border: 1.5px solid var(--border);
    cursor: pointer;
    transition: all 0.25s ease;
    background: var(--white);
    position: relative;
  }
  .pay-option:hover { border-color: var(--gold); background: #FFFDF9; }
  .pay-option.selected {
    border-color: var(--gold);
    background: linear-gradient(135deg, #FFFDF9, #FDF8EE);
    box-shadow: 0 0 0 4px rgba(201,169,110,0.08);
  }
  .pay-option input[type="radio"] { display: none; }
  .pay-radio {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid var(--border);
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.2s;
  }
  .pay-option.selected .pay-radio {
    border-color: var(--gold);
  }
  .pay-radio-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--gold);
    opacity: 0;
    transform: scale(0);
    transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  }
  .pay-option.selected .pay-radio-dot { opacity: 1; transform: scale(1); }

  /* location button */
  .location-btn {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 20px;
    border-radius: 14px;
    background: linear-gradient(135deg, #FFFDF9, #FDF5E4);
    border: 1.5px solid var(--gold-lt);
    cursor: pointer;
    transition: all 0.25s;
  }
  .location-btn:hover { border-color: var(--gold); box-shadow: 0 4px 20px rgba(201,169,110,0.12); }

  /* CTA button */
  .cta-btn {
    width: 100%;
    padding: 18px;
    border-radius: 14px;
    background: var(--ink);
    color: var(--white);
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: none;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .cta-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, var(--gold), #A07840);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .cta-btn:hover::before { opacity: 1; }
  .cta-btn > * { position: relative; z-index: 1; }
  .cta-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .cta-btn:disabled::before { display: none; }

  /* separator line */
  .sep { height: 1px; background: var(--border); margin: 16px 0; }

  /* cart item */
  .cart-item {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .cart-item:last-child { border-bottom: none; }
  .cart-thumb {
    width: 46px; height: 46px;
    border-radius: 10px;
    background: linear-gradient(135deg, #F0FAF4, #D4F0E0);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* totals */
  .total-row {
    display: flex; justify-content: space-between; align-items: center;
    font-size: 13px;
  }
  .total-row.grand {
    padding-top: 14px;
    margin-top: 6px;
    border-top: 1px solid var(--border);
  }

  /* error */
  .err-box {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 16px;
    border-radius: 10px;
    background: #FFF5F5;
    border: 1px solid #FFD5D5;
    color: #C0392B;
    font-size: 13px;
  }

  /* success page */
  .success-root {
    min-height: 100vh;
    background: var(--ivory);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .success-card {
    max-width: 480px; width: 100%;
    background: var(--white);
    border: 1px solid var(--border);
    border-radius: 28px;
    box-shadow: var(--shadow-lg);
    padding: 52px 44px;
    text-align: center;
  }
  .success-icon-ring {
    width: 88px; height: 88px;
    border-radius: 50%;
    border: 1.5px solid var(--gold-lt);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 28px;
    animation: ring-pulse 2s ease infinite;
  }
  @keyframes ring-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(201,169,110,0.3); }
    50% { box-shadow: 0 0 0 12px rgba(201,169,110,0); }
  }
  .success-order-badge {
    display: inline-block;
    padding: 8px 20px;
    border-radius: 999px;
    background: linear-gradient(135deg, #FFFDF9, #FDF5E4);
    border: 1px solid var(--gold-lt);
    font-family: 'DM Mono', monospace;
    font-size: 13px;
    color: var(--gold);
    font-weight: 600;
    letter-spacing: 0.08em;
    margin: 10px 0 24px;
  }

  /* modal overlay */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(26,26,26,0.55);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 50; padding: 16px;
    animation: fade-in 0.2s ease;
  }
  @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
  .modal-card {
    background: var(--white);
    border-radius: 24px;
    box-shadow: 0 32px 80px rgba(26,26,26,0.20);
    width: 100%; max-width: 440px;
    overflow: hidden;
    animation: slide-up 0.3s cubic-bezier(0.34,1.2,0.64,1);
  }
  @keyframes slide-up { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

  .modal-header {
    padding: 28px 32px 24px;
    border-bottom: 1px solid var(--border);
  }
  .modal-body { padding: 28px 32px; }

  /* input */
  .input-field {
    width: 100%;
    padding: 14px 18px;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    font-size: 14px;
    color: var(--ink);
    background: var(--white);
    outline: none;
    transition: border-color 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .input-field:focus { border-color: var(--gold); }
  .input-field.has-icon { padding-left: 46px; }

  .input-wrapper { position: relative; }
  .input-icon {
    position: absolute; left: 15px; top: 50%; transform: translateY(-50%);
    color: var(--ink-lt);
  }

  /* tag badge */
  .tag {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .tag-gold {
    background: linear-gradient(135deg, #FFFDF9, #FDF5E4);
    border: 1px solid var(--gold-lt);
    color: var(--gold);
  }
  .tag-green {
    background: #F0FAF4;
    border: 1px solid #A8E6C0;
    color: #1E7A44;
  }

  /* page enter animation */
  .animate-enter {
    animation: enter 0.5s ease both;
  }
  @keyframes enter { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
  .delay-1 { animation-delay: 0.08s }
  .delay-2 { animation-delay: 0.16s }
  .delay-3 { animation-delay: 0.24s }
  .delay-4 { animation-delay: 0.32s }

  /* ── SECURITY PAYMENT STYLES ── */

  /* Stepper */
  .sec-stepper {
    display: flex; align-items: center; justify-content: center; gap: 0;
    padding: 0 32px 0;
    margin-bottom: 0;
  }
  .sec-step {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    flex: 1;
  }
  .sec-step-circle {
    width: 30px; height: 30px; border-radius: 50%;
    border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600;
    color: var(--ink-lt);
    background: var(--white);
    transition: all 0.3s ease;
    position: relative; z-index: 1;
  }
  .sec-step.active .sec-step-circle {
    border-color: var(--gold); background: var(--gold); color: var(--white);
    box-shadow: 0 0 0 4px rgba(201,169,110,0.15);
  }
  .sec-step.done .sec-step-circle {
    border-color: #1E7A44; background: #1E7A44; color: var(--white);
  }
  .sec-step-label {
    font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase;
    color: var(--ink-lt); text-align: center;
  }
  .sec-step.active .sec-step-label { color: var(--gold); font-weight: 500; }
  .sec-step.done .sec-step-label { color: #1E7A44; }
  .sec-step-line {
    flex: 1; height: 1px; background: var(--border);
    margin-top: -18px; position: relative; z-index: 0;
  }
  .sec-step-line.done { background: var(--gold); }

  /* OTP inputs */
  .otp-group {
    display: flex; gap: 10px; justify-content: center;
  }
  .otp-input {
    width: 52px; height: 60px;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    text-align: center;
    font-size: 22px; font-weight: 600;
    color: var(--ink);
    background: var(--white);
    outline: none;
    transition: all 0.2s;
    caret-color: var(--gold);
    font-family: 'DM Sans', sans-serif;
  }
  .otp-input:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 4px rgba(201,169,110,0.12);
    transform: translateY(-2px);
  }
  .otp-input.filled {
    border-color: var(--gold);
    background: linear-gradient(135deg, #FFFDF9, #FDF8EE);
  }

  /* Scan animation */
  .scan-container {
    position: relative; overflow: hidden;
    border-radius: 16px; border: 1px solid var(--border);
    background: var(--ivory);
    padding: 20px;
  }
  .scan-line {
    position: absolute; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
    animation: scan-sweep 2s ease-in-out infinite;
    box-shadow: 0 0 12px rgba(201,169,110,0.6);
  }
  @keyframes scan-sweep {
    0% { top: 0%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }

  /* Security checks */
  .sec-check {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0;
  }
  .sec-check-icon {
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 11px;
  }
  .sec-check-icon.pending {
    border: 1.5px solid var(--border);
    background: transparent;
  }
  .sec-check-icon.loading {
    border: 1.5px solid var(--gold);
    background: transparent;
    animation: spin-border 1s linear infinite;
  }
  .sec-check-icon.done {
    background: #1E7A44; border: none;
  }
  @keyframes spin-border {
    to { transform: rotate(360deg); }
  }

  /* Security vault header */
  .vault-header {
    background: linear-gradient(135deg, var(--ink) 0%, #2A2010 100%);
    padding: 24px 28px 20px;
    position: relative; overflow: hidden;
  }
  .vault-header::before {
    content: '';
    position: absolute; top: -40px; right: -40px;
    width: 120px; height: 120px;
    border-radius: 50%;
    background: rgba(201,169,110,0.08);
  }
  .vault-header::after {
    content: '';
    position: absolute; bottom: -20px; left: 20px;
    width: 80px; height: 80px;
    border-radius: 50%;
    background: rgba(201,169,110,0.05);
  }

  /* Progress bar */
  .sec-progress-bar {
    height: 3px;
    background: var(--border);
    border-radius: 999px;
    overflow: hidden;
    margin-top: 14px;
  }
  .sec-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--gold-lt), var(--gold));
    border-radius: 999px;
    transition: width 0.5s cubic-bezier(0.4,0,0.2,1);
  }

  /* Shield badge */
  .shield-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(201,169,110,0.12);
    border: 1px solid rgba(201,169,110,0.25);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--gold-lt);
  }

  /* Transaction ID display */
  .tx-display {
    background: var(--ivory);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 18px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink);
    letter-spacing: 0.1em;
    text-align: center;
    word-break: break-all;
  }

  /* Copy button */
  .copy-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 8px;
    background: none; border: 1px solid var(--border);
    font-size: 11px; color: var(--ink-lt); cursor: pointer;
    transition: all 0.2s; letter-spacing: 0.05em; text-transform: uppercase;
  }
  .copy-btn:hover { border-color: var(--gold); color: var(--gold); }
  .copy-btn.copied { border-color: #1E7A44; color: #1E7A44; }

  /* Phone input styled */
  .phone-flag {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 18px;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    background: var(--white);
    transition: border-color 0.2s;
  }
  .phone-flag:focus-within { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201,169,110,0.10); }
  .phone-flag-prefix {
    font-size: 13px; font-weight: 500; color: var(--ink-md);
    border-right: 1px solid var(--border); padding-right: 10px; flex-shrink: 0;
  }
  .phone-flag input {
    flex: 1; border: none; outline: none; font-size: 14px;
    color: var(--ink); background: transparent;
    font-family: 'DM Sans', sans-serif;
    font-weight: 500; letter-spacing: 0.04em;
  }

  /* Security seal row */
  .seal-row {
    display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap; gap: 16px;
    padding: 12px 20px;
    border-top: 1px solid var(--border);
    background: var(--ivory);
  }
  .seal-item {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; color: var(--ink-lt); letter-spacing: 0.06em;
    text-transform: uppercase;
  }
`;

/* ─────────────────────────────────────────────
   Payment Config
───────────────────────────────────────────── */
const PAYMENT_METHODS_CONFIG = {
  wave: {
    id: 'wave',
    name: 'Wave',
    description: 'Paiement instantané, sécurisé',
    icon: <Smartphone size={17} />,
    fee: 2,
    paymentLink: (amount: number) => {
      const totalWithFee = Math.ceil(amount * 1.02);
      return `https://pay.wave.com/m/M_sn_G4vyn-BvhQxV/c/sn/${totalWithFee}`;
    },
    minAmount: 100,
    maxAmount: 1000000,
  },
  orange_money: {
    id: 'orange_money',
    name: 'Orange Money',
    description: 'Paiement mobile Orange',
    icon: <Smartphone size={17} />,
    fee: 2,
    paymentLink: null,
    merchantPhone: '77 974 70 73',
    minAmount: 100,
    maxAmount: 1000000,
  },
};

/* ─────────────────────────────────────────────
   Payment Modal
───────────────────────────────────────────── */
interface PaymentStepProps {
  method: typeof PAYMENT_METHODS_CONFIG.wave;
  amount: number;
  onConfirm: (transactionId: string) => void;
  onBack: () => void;
}

/* ── Helpers ── */
function generateTxRef(method: string) {
  const prefix = method === 'wave' ? 'WV' : 'OM';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

/* ── Main PaymentModal ── */
function PaymentModal({ method, amount, onConfirm, onBack }: PaymentStepProps) {
  type Step = 'tx' | 'success';
  const [step, setStep] = useState<Step>('tx');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  const [txRef] = useState(() => generateTxRef(method.id));

  const feeAmount = amount * (method.fee / 100);
  const totalWithFee = Math.ceil(amount + feeAmount);
  const wavePaymentUrl = method.paymentLink ? method.paymentLink(amount) : null;

  // Ouvre automatiquement Wave au montage si disponible
  useEffect(() => {
    if (method.id === 'wave' && wavePaymentUrl) {
      window.open(wavePaymentUrl, '_blank');
    }
  }, []);

  const handleTxSubmit = () => {
    if (!transactionId.trim()) { setError('Veuillez entrer l\'identifiant de transaction'); return; }
    if (transactionId.trim().length < 6) { setError('Identifiant trop court'); return; }
    setError('');
    setStep('success');
    setTimeout(() => onConfirm(transactionId.trim()), 2000);
  };

  /* ── STEP: TRANSACTION ID ── */
  if (step === 'tx') return (
    <div className="modal-card" style={{ maxWidth:460 }}>
      <div className="vault-header" style={{ padding:'20px 28px' }}>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(201,169,110,0.15)', border:'1px solid rgba(201,169,110,0.3)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--gold)' }}>
              {method.icon}
            </div>
            <div>
              <p className="serif" style={{ fontSize:20, color:'#FFFFFF', fontWeight:400 }}>{method.name}</p>
              <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:3 }}>Confirmez votre paiement</p>
            </div>
          </div>
          <span className="shield-badge"><Shield size={9} /> Sécurisé</span>
        </div>
        {/* Amount */}
        <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, border:'1px solid rgba(255,255,255,0.10)', padding:'10px 14px', marginTop:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'0.08em', textTransform:'uppercase' }}>Montant payé</span>
            <span className="serif" style={{ fontSize:22, fontWeight:400, color:'#FFFFFF' }}>
              {totalWithFee.toLocaleString()} <span style={{ fontSize:13, color:'rgba(255,255,255,0.55)' }}>FCFA</span>
            </span>
          </div>
          {method.fee > 0 && (
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:4 }}>
              Dont frais ({method.fee}%) : {Math.ceil(feeAmount).toLocaleString()} FCFA
            </div>
          )}
        </div>
      </div>

      <div style={{ padding:'24px 28px', display:'flex', flexDirection:'column', gap:16 }}>

        {/* Instructions */}
        <div style={{ background:'var(--ivory)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)', display:'flex', alignItems:'flex-start', gap:10 }}>
          <div style={{ color:'var(--gold)', marginTop:1, flexShrink:0 }}>
            {method.id === 'wave' ? <ExternalLink size={14} /> : <Smartphone size={14} />}
          </div>
          <div>
            {method.id === 'wave'
              ? <>
                  <p style={{ fontSize:13, fontWeight:500, color:'var(--ink)', marginBottom:3 }}>Le portail Wave vient de s'ouvrir</p>
                  <p style={{ fontSize:12, color:'var(--ink-lt)', lineHeight:1.5 }}>
                    Effectuez le paiement de <strong>{totalWithFee.toLocaleString()} FCFA</strong>, puis copiez l'ID de transaction reçu par SMS.
                  </p>
                </>
              : <>
                  <p style={{ fontSize:13, fontWeight:500, color:'var(--ink)', marginBottom:3 }}>Paiement Orange Money</p>
                  <p style={{ fontSize:12, color:'var(--ink-lt)', lineHeight:1.5 }}>
                    Envoyez <strong>{totalWithFee.toLocaleString()} FCFA</strong> au numéro marchand :
                  </p>
                  <div style={{ marginTop:8, padding:'8px 14px', background:'linear-gradient(135deg, #FFF8EE, #FFF0D4)', borderRadius:8, border:'1px solid #FFD580', display:'inline-block' }}>
                    <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:'#E87800', letterSpacing:'0.08em' }}>
                      📱 +221 {(method as any).merchantPhone}
                    </span>
                  </div>
                  <p style={{ fontSize:11, color:'var(--ink-lt)', marginTop:6 }}>
                    Composez <strong>#144#</strong> depuis votre téléphone Orange.
                  </p>
                </>
            }
          </div>
        </div>

        {/* Transaction ID input */}
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:500, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--ink-md)', marginBottom:8 }}>
            Identifiant de transaction reçu par SMS
          </label>
          <div className="input-wrapper">
            <Receipt size={15} className="input-icon" />
            <input
              type="text" value={transactionId}
              onChange={e => { setTransactionId(e.target.value); setError(''); }}
              placeholder={method.id === 'wave' ? 'Ex: WAVE-20250607-XXXXX' : 'Ex: OM-20250607-XXXXX'}
              className="input-field has-icon"
              style={{ fontFamily:'monospace', letterSpacing:'0.04em', fontSize:13 }}
              autoFocus
            />
          </div>
          <p style={{ fontSize:11, color:'var(--ink-lt)', marginTop:6 }}>
            Cet identifiant est envoyé automatiquement par {method.name} après chaque paiement réussi.
          </p>
        </div>

        {error && <div className="err-box"><AlertCircle size={13} />{error}</div>}

        <button onClick={handleTxSubmit} className="cta-btn">
          <CheckCircle size={15} />
          Confirmer la commande
        </button>

        <button onClick={onBack} style={{ fontSize:11, color:'var(--ink-lt)', letterSpacing:'0.08em', textAlign:'center', textTransform:'uppercase', background:'none', border:'none', cursor:'pointer' }}>
          ← Annuler
        </button>
      </div>

      <div className="seal-row">
        {[{ icon:<Lock size={10}/>, label:'SSL 256-bit' }, { icon:<Shield size={10}/>, label:'Anti-fraude' }, { icon:<CheckCircle size={10}/>, label:'Certifié BCEAO' }].map(s => (
          <div key={s.label} className="seal-item"><span style={{ color:'var(--gold)' }}>{s.icon}</span>{s.label}</div>
        ))}
      </div>
    </div>
  );

  /* ── STEP: SUCCESS ── */
  if (step === 'success') return (
    <div className="modal-card" style={{ maxWidth:460 }}>
      <div className="vault-header" style={{ padding:'24px 28px 20px' }}>
        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:'50%', background:'rgba(74,222,128,0.15)', border:'1px solid rgba(74,222,128,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <CheckCircle size={18} style={{ color:'#4ADE80' }} />
          </div>
          <div>
            <p className="serif" style={{ fontSize:20, color:'#FFFFFF', fontWeight:400 }}>Paiement validé</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Transaction sécurisée et enregistrée</p>
          </div>
        </div>
      </div>

      <div style={{ padding:'28px 28px 24px', display:'flex', flexDirection:'column', gap:16, textAlign:'center' }}>
        {/* Success ring */}
        <div style={{ width:72, height:72, borderRadius:'50%', border:'1.5px solid var(--gold-lt)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto', animation:'ring-pulse 2s ease infinite' }}>
          <CheckCircle size={30} style={{ color:'var(--gold)' }} />
        </div>

        <div>
          <p className="serif" style={{ fontSize:22, fontWeight:400, color:'var(--ink)', marginBottom:4 }}>Transaction <em>confirmée</em></p>
          <p style={{ fontSize:13, color:'var(--ink-lt)' }}>Votre paiement a été enregistré avec succès</p>
        </div>

        {/* TX details */}
        <div style={{ background:'var(--ivory)', borderRadius:14, padding:'16px', border:'1px solid var(--border)', textAlign:'left', display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { label:'Référence AgriMarché', value:txRef, mono:true },
            { label:'Identifiant transaction', value:transactionId, mono:true },
            { label:'Montant payé', value:`${totalWithFee.toLocaleString()} FCFA`, mono:false },
            { label:'Méthode', value:method.name, mono:false },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
              <span style={{ color:'var(--ink-lt)' }}>{row.label}</span>
              <span style={{ fontFamily: row.mono ? 'monospace' : 'inherit', fontWeight:600, color:'var(--ink)', fontSize: row.mono ? 11 : 13 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize:11, color:'var(--ink-lt)', lineHeight:1.5 }}>
          Redirection vers votre commande dans quelques secondes…
        </p>
      </div>

      <div className="seal-row">
        {[{ icon:<Lock size={10}/>, label:'SSL 256-bit' }, { icon:<Shield size={10}/>, label:'Anti-fraude' }, { icon:<CheckCircle size={10}/>, label:'Certifié BCEAO' }].map(s => (
          <div key={s.label} className="seal-item"><span style={{ color:'var(--gold)' }}>{s.icon}</span>{s.label}</div>
        ))}
      </div>
    </div>
  );

  return null;
}

/* ─────────────────────────────────────────────
   Main Checkout Page
───────────────────────────────────────────── */
export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, clearCart } = useCart() as { cart: { items: any[]; total: number; itemCount: number }; clearCart: () => void };
  const { location, loading: locationLoading, detectLocation } = useUserLocation();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('wave');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activePaymentMethod, setActivePaymentMethod] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderError, setOrderError] = useState('');

  const cartItems = useMemo(() => cart?.items || [], [cart]);
  const subtotal = useMemo(() => cart?.total || 0, [cart]);
  const isFreeDelivery = subtotal >= 5000;

  const deliveryFee = useMemo(() => {
    if (isFreeDelivery) return 0;
    if (!location?.lat || !location?.lng) return 1000;
    const dist = Math.sqrt(Math.pow(location.lat - 14.7167, 2) + Math.pow(location.lng + 17.4677, 2)) * 111;
    if (dist <= 10) return 500;
    if (dist <= 30) return 1000;
    if (dist <= 100) return 1500;
    return 2000;
  }, [location, isFreeDelivery]);

  const total = subtotal + deliveryFee;

  const estimatedDelivery = useMemo(() => {
    if (isFreeDelivery) return '24 – 48 h (Express)';
    if (!location?.lat || !location?.lng) return 'À confirmer';
    const dist = Math.sqrt(Math.pow(location.lat - 14.7167, 2) + Math.pow(location.lng + 17.4677, 2)) * 111;
    if (dist <= 10) return '24 h';
    if (dist <= 30) return '24 – 48 h';
    if (dist <= 100) return '48 – 72 h';
    return '3 – 5 jours';
  }, [location, isFreeDelivery]);

  const generateOrderNumber = useCallback(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `AGR-${y}${m}${day}-${r}`;
  }, []);

  const createOrder = async (transactionId?: string) => {
    if (cartItems.length === 0) { setOrderError('Votre panier est vide'); return false; }
    setIsProcessing(true); setOrderError('');
    try {
      const firstItem = cartItems[0];
      const orderNumber = generateOrderNumber();
      const safeSellerId = firstItem?.product?.sellerId || user?.uid || 'agrimarche-official';
      const safeSellerName = firstItem?.product?.sellerName || 'AgriMarché';
      const safeSellerPhone = firstItem?.product?.sellerPhone || '221779747073';
      const safeSellerRegion = firstItem?.product?.region || 'Dakar, Sénégal';
      let sellerLat = 14.7167; let sellerLng = -17.4677; let sellerAddress = 'Dakar, Sénégal';
      if (safeSellerId && safeSellerId !== 'agrimarche-official') {
        try {
          const sellerDoc = await getDoc(doc(db, 'users', safeSellerId));
          if (sellerDoc.exists()) {
            const d = sellerDoc.data();
            sellerLat = d?.latitude || d?.lat || 14.7167;
            sellerLng = d?.longitude || d?.lng || -17.4677;
            sellerAddress = d?.address || d?.city || 'Dakar, Sénégal';
          }
        } catch {}
      }
      const selectedMethod = PAYMENT_METHODS_CONFIG[selectedPaymentMethod as keyof typeof PAYMENT_METHODS_CONFIG];
      const paymentStatus = transactionId ? 'paye' : 'en_attente';
      const newOrder = {
        id: orderNumber, sellerId: safeSellerId, sellerName: safeSellerName,
        sellerPhone: safeSellerPhone, sellerRegion: safeSellerRegion,
        userId: user?.uid || 'guest-user', userName: user?.displayName || 'Client AgriMarché',
        userEmail: user?.email || '', userPhone: (user as any)?.phoneNumber || '',
        sellerLocation: { lat: sellerLat, lng: sellerLng, address: sellerAddress },
        customerLocation: { lat: location?.lat || null, lng: location?.lng || null, address: location?.address || location?.city || 'Adresse non détectée' },
        date: new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }),
        timestamp: new Date().toISOString(), status: 'en_attente', statusLabel: 'En attente de validation',
        subtotal, deliveryFee, isFreeDelivery, total,
        paymentMethod: selectedPaymentMethod, paymentMethodName: selectedMethod?.name,
        paymentStatus, transactionId: transactionId || null,
        items: cartItems.map(item => ({
          productId: item?.product?.id || 'unknown', productName: item?.product?.name || 'Produit inconnu',
          productPrice: item?.product?.price || 0, quantity: item?.quantity || 1,
          unit: item?.product?.unit || 'kg', total: (item?.product?.price || 0) * (item?.quantity || 1),
          image: item?.product?.images?.[0] || null, category: item?.product?.category || 'Autres',
        })),
        deliveryTime: estimatedDelivery, createdAt: Timestamp.now(), updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'orders'), newOrder);
      await initDeliveryTracking(docRef.id);
      await updateDoc(doc(db, 'orders', docRef.id), { estimatedDelivery: Timestamp.fromDate(getEstimatedDeliveryDate(new Date())) });
      for (const item of cartItems) {
        if (item?.product?.id) await updateDoc(doc(db, 'products', item.product.id), { stock: increment(-(item.quantity || 1)) });
      }
      setOrderId(orderNumber); clearCart(); setSuccess(true);
      setTimeout(() => router.push('/account/orders'), 3000);
      return true;
    } catch (err) {
      console.error(err); setOrderError('Une erreur est survenue. Veuillez réessayer.'); return false;
    } finally { setIsProcessing(false); }
  };

  const handlePaymentConfirm = async (txId: string) => { setShowPaymentModal(false); await createOrder(txId); };

  const handleCheckout = async () => {
    if (!user) { router.push('/auth/login?redirect=/checkout'); return; }
    if (cartItems.length === 0) { setOrderError('Votre panier est vide'); return; }
    const method = PAYMENT_METHODS_CONFIG[selectedPaymentMethod as keyof typeof PAYMENT_METHODS_CONFIG];
    if (method) { setActivePaymentMethod(method); setShowPaymentModal(true); }
  };

  /* ── Success screen ── */
  if (success) return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div className="success-root checkout-root">
        <div className="success-card animate-enter">
          <div className="success-icon-ring">
            <CheckCircle size={36} style={{ color:'var(--gold)' }} />
          </div>
          <p className="serif" style={{ fontSize:32, fontWeight:300, color:'var(--ink)', lineHeight:1.2 }}>Commande<br /><em>confirmée</em></p>
          <p style={{ fontSize:13, color:'var(--ink-lt)', marginTop:8 }}>Merci pour votre confiance</p>
          <div className="success-order-badge">{orderId}</div>

          <div style={{ background:'var(--ivory)', borderRadius:16, padding:'16px 20px', border:'1px solid var(--border)', textAlign:'left', marginBottom:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <Truck size={14} style={{ color:'var(--gold)' }} />
              <span style={{ fontSize:11, fontWeight:500, letterSpacing:'0.10em', textTransform:'uppercase', color:'var(--ink-md)' }}>Livraison estimée</span>
            </div>
            <p style={{ fontSize:15, color:'var(--ink)', fontWeight:400 }}>{estimatedDelivery}</p>
            {isFreeDelivery && (
              <span className="tag tag-green" style={{ marginTop:8 }}><Gift size={10} /> Livraison offerte</span>
            )}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Link href="/account/orders" className="cta-btn" style={{ textDecoration:'none', borderRadius:14 }}>
              Mes commandes
            </Link>
            <Link href="/main/products" style={{ textDecoration:'none', textAlign:'center', fontSize:12, color:'var(--ink-lt)', letterSpacing:'0.08em', textTransform:'uppercase', padding:'12px', display:'block' }}>
              Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </>
  );

  /* ── Main checkout ── */
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div className="checkout-root">
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'40px 20px' }}>

          {/* Top nav */}
          <div className="animate-enter" style={{ display:'flex', alignItems:'center', gap:16, marginBottom:40 }}>
            <button onClick={() => router.back()} style={{ width:40, height:40, borderRadius:'50%', border:'1px solid var(--border)', background:'var(--white)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink-md)', flexShrink:0, transition:'all 0.2s' }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <p style={{ fontSize:11, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--ink-lt)', marginBottom:2 }}>AgriMarché</p>
              <h1 className="serif" style={{ fontSize:28, fontWeight:400, color:'var(--ink)', lineHeight:1 }}>Validation de commande</h1>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <Lock size={12} style={{ color:'var(--gold)' }} />
              <span style={{ fontSize:11, color:'var(--ink-lt)', letterSpacing:'0.06em' }}>Paiement sécurisé</span>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:28 }} className="checkout-grid">
            <style>{`@media(min-width:1024px){.checkout-grid{grid-template-columns:1fr 400px !important;}}`}</style>

            {/* LEFT */}
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

              {/* Delivery */}
              <div className="card animate-enter delay-1">
                <div className="card-header">
                  <div className="card-header-dot" />
                  <Truck size={14} style={{ color:'var(--ink-lt)' }} />
                  <span className="card-header-title">Adresse de livraison</span>
                </div>
                <div className="card-body">
                  <button className="location-btn" onClick={detectLocation}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div className="icon-circle"><Navigation size={16} /></div>
                      <div style={{ textAlign:'left' }}>
                        <p style={{ fontSize:14, fontWeight:500, color:'var(--ink)', marginBottom:2 }}>Utiliser ma position GPS</p>
                        {locationLoading
                          ? <p style={{ fontSize:12, color:'var(--ink-lt)' }}>Détection en cours…</p>
                          : location?.city
                            ? <p style={{ fontSize:12, color:'var(--gold)' }}>{location.city}{location.region ? `, ${location.region}` : ''}</p>
                            : <p style={{ fontSize:12, color:'var(--ink-lt)' }}>Cliquez pour détecter automatiquement</p>}
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color:'var(--gold)', flexShrink:0 }} />
                  </button>
                  {location?.address && (
                    <div style={{ marginTop:12, padding:'12px 16px', background:'var(--ivory)', borderRadius:10, border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
                      <MapPin size={14} style={{ color:'var(--gold)', flexShrink:0 }} />
                      <span style={{ fontSize:13, color:'var(--ink-md)' }}>{location.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="card animate-enter delay-2">
                <div className="card-header">
                  <div className="card-header-dot" />
                  <User size={14} style={{ color:'var(--ink-lt)' }} />
                  <span className="card-header-title">Informations de contact</span>
                </div>
                <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {[
                    { icon: <User size={15} />, label:'Nom complet', value: user?.displayName || 'Client AgriMarché' },
                    { icon: <Mail size={15} />, label:'Adresse e-mail', value: user?.email || 'Non renseigné' },
                    { icon: <Phone size={15} />, label:'Téléphone', value: (user as any)?.phoneNumber || 'À renseigner' },
                  ].map((row) => (
                    <div key={row.label} className="info-row">
                      <div className="icon-circle" style={{ width:34, height:34 }}>{row.icon}</div>
                      <div>
                        <p className="info-row-label">{row.label}</p>
                        <p className="info-row-value">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="card animate-enter delay-3">
                <div className="card-header">
                  <div className="card-header-dot" />
                  <CreditCard size={14} style={{ color:'var(--ink-lt)' }} />
                  <span className="card-header-title">Moyen de paiement</span>
                </div>
                <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {Object.values(PAYMENT_METHODS_CONFIG).map((method) => (
                    <label
                      key={method.id}
                      className={`pay-option${selectedPaymentMethod === method.id ? ' selected' : ''}`}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                    >
                      <input type="radio" name="paymentMethod" value={method.id} readOnly checked={selectedPaymentMethod === method.id} />
                      <div className="pay-radio"><div className="pay-radio-dot" /></div>
                      <div className="icon-circle" style={{ width:36, height:36 }}>{method.icon}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:14, fontWeight:500, color:'var(--ink)', marginBottom:2 }}>{method.name}</p>
                        <p style={{ fontSize:12, color:'var(--ink-lt)' }}>
                          {method.description}
                          {method.fee > 0 && <span style={{ color:'var(--gold)', marginLeft:6 }}>+{method.fee}% frais</span>}
                        </p>
                      </div>
                      {selectedPaymentMethod === method.id && (
                        <span className="tag tag-gold"><Check size={10} /> Sélectionné</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Summary */}
            <div style={{ position:'sticky', top:24, alignSelf:'start' }} className="animate-enter delay-4">
              <div className="card">
                {/* Summary header */}
                <div style={{ background:'var(--ink)', padding:'20px 28px', display:'flex', alignItems:'center', gap:10 }}>
                  <ShoppingBag size={16} style={{ color:'var(--gold)' }} />
                  <span className="serif" style={{ fontSize:18, fontWeight:400, color:'var(--white)', letterSpacing:'0.02em' }}>Récapitulatif</span>
                  <span style={{ marginLeft:'auto', fontSize:12, color:'rgba(255,255,255,0.4)', letterSpacing:'0.06em' }}>{cartItems.length} article{cartItems.length > 1 ? 's' : ''}</span>
                </div>

                <div className="card-body">
                  {/* Items */}
                  <div style={{ maxHeight:280, overflowY:'auto', marginBottom:16 }}>
                    {cartItems.map((item: any, idx: number) => (
                      <div key={idx} className="cart-item">
                        <div className="cart-thumb">
                          <Leaf size={18} style={{ color:'#2D7A4E' }} />
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:500, color:'var(--ink)', marginBottom:2 }}>{item?.product?.name}</p>
                          <p style={{ fontSize:11, color:'var(--ink-lt)' }}>{item?.quantity} × {(item?.product?.price || 0).toLocaleString()} FCFA</p>
                        </div>
                        <p style={{ fontSize:13, fontWeight:600, color:'var(--ink)', flexShrink:0 }}>
                          {((item?.product?.price || 0) * (item?.quantity || 0)).toLocaleString()} <span style={{ fontSize:10, color:'var(--ink-lt)' }}>FCFA</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div className="total-row">
                      <span style={{ color:'var(--ink-lt)', fontSize:13 }}>Sous-total</span>
                      <span style={{ fontSize:13, color:'var(--ink)' }}>{subtotal.toLocaleString()} FCFA</span>
                    </div>
                    <div className="total-row">
                      <span style={{ color:'var(--ink-lt)', fontSize:13 }}>Livraison</span>
                      <span style={{ fontSize:13, color: isFreeDelivery ? '#1E7A44' : 'var(--ink)' }}>
                        {isFreeDelivery ? 'Offerte' : `${deliveryFee.toLocaleString()} FCFA`}
                      </span>
                    </div>
                    {isFreeDelivery && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 12px', background:'#F0FAF4', borderRadius:8, border:'1px solid #A8E6C0' }}>
                        <Gift size={12} style={{ color:'#1E7A44' }} />
                        <span style={{ fontSize:11, color:'#1E7A44', letterSpacing:'0.04em' }}>Livraison offerte dès 5 000 FCFA</span>
                      </div>
                    )}
                    <div className="total-row grand">
                      <span style={{ fontSize:14, fontWeight:500, color:'var(--ink)', letterSpacing:'0.04em' }}>Total TTC</span>
                      <span className="serif" style={{ fontSize:24, fontWeight:500, color:'var(--ink)' }}>{total.toLocaleString()} <span style={{ fontSize:14, fontWeight:400 }}>FCFA</span></span>
                    </div>
                  </div>

                  {/* Delivery info */}
                  <div style={{ marginTop:16, padding:'12px 16px', background:'var(--ivory)', borderRadius:12, border:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                    <Truck size={14} style={{ color:'var(--gold)', flexShrink:0 }} />
                    <div>
                      <p style={{ fontSize:11, color:'var(--ink-lt)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:2 }}>Livraison estimée</p>
                      <p style={{ fontSize:13, color:'var(--ink)', fontWeight:500 }}>{estimatedDelivery}</p>
                    </div>
                  </div>

                  {orderError && (
                    <div className="err-box" style={{ marginTop:14 }}>
                      <AlertCircle size={14} />{orderError}
                    </div>
                  )}

                  {/* CTA */}
                  <button onClick={handleCheckout} disabled={isProcessing || cartItems.length === 0} className="cta-btn" style={{ marginTop:20 }}>
                    {isProcessing
                      ? <><Loader2 size={16} style={{ animation:'spin 1s linear infinite' }} /> Traitement…</>
                      : <>Confirmer la commande &nbsp;→</>}
                  </button>

                  <div style={{ marginTop:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <Lock size={11} style={{ color:'var(--ink-lt)' }} />
                    <span style={{ fontSize:11, color:'var(--ink-lt)', letterSpacing:'0.06em' }}>Paiement 100% sécurisé · Livraison garantie</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && activePaymentMethod && (
        <div className="modal-overlay">
          <PaymentModal
            method={activePaymentMethod}
            amount={total}
            onConfirm={handlePaymentConfirm}
            onBack={() => setShowPaymentModal(false)}
          />
        </div>
      )}
    </>
  );
}
