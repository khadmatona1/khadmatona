"use client";

import { useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { CalendarDays, CheckCircle2, Clock3, FileCheck2, LockKeyhole, PenLine, ShieldCheck, Upload, UsersRound } from "lucide-react";
import { ApiError } from "@/lib/api";
import { getStayContract, signStayContract } from "@/lib/stay-contract";
import type { StayContractData } from "@/types/stay-contract";

const copy = {
  en: {
    eyebrow: "Secure online contract", title: "Complete your stay contract", intro: "Review your confirmed booking, complete your identity details, and sign before arrival.",
    secure: "Private data", signature: "Electronic signature", digital: "Digital contract", client: "Client information", stay: "Stay details", rules: "Stay rules", sign: "Client signature",
    name: "Full name", phone: "Phone / WhatsApp", email: "Email", nationality: "Nationality", identity: "CIN / Passport number", birth: "Date of birth", address: "Current address", document: "CIN / Passport copy", documentHelp: "JPG, PNG or PDF · maximum 5 MB", arrival: "Estimated arrival time",
    property: "Property", guests: "Guests", checkIn: "Check-in", checkOut: "Check-out", reference: "Booking reference", total: "Agreed total", clear: "Clear signature", signHelp: "Sign with your finger or mouse.", accept: "I have read and accept the stay rules and confirm that the information provided is correct.", submit: "Sign and generate my contract", sending: "Saving contract…",
    rulesList: ["Check-in from 14:00", "Check-out before 11:00", "No smoking inside", "No excessive noise after 23:00", "Only declared guests are permitted", "Damage may be charged"],
    signedTitle: "Your stay contract is signed", signedIntro: "Your electronic signature and identity details have been securely recorded.", signedOn: "Signed on", print: "Print or save as PDF", loadError: "This contract link is invalid, expired, or temporarily unavailable.", submitError: "The contract could not be saved. Check the fields and try again.", signatureRequired: "Please add your signature before submitting.",
  },
  fr: {
    eyebrow: "Contrat en ligne sécurisé", title: "Finalisez votre contrat de séjour", intro: "Vérifiez votre réservation, complétez votre identité et signez avant votre arrivée.",
    secure: "Données privées", signature: "Signature électronique", digital: "Contrat digital", client: "Informations du client", stay: "Détails du séjour", rules: "Règles de séjour", sign: "Signature du client",
    name: "Nom complet", phone: "Téléphone / WhatsApp", email: "Email", nationality: "Nationalité", identity: "N° CIN / Passeport", birth: "Date de naissance", address: "Adresse actuelle", document: "Copie CIN / Passeport", documentHelp: "JPG, PNG ou PDF · 5 Mo maximum", arrival: "Heure d’arrivée estimée",
    property: "Bien", guests: "Voyageurs", checkIn: "Arrivée", checkOut: "Départ", reference: "Référence réservation", total: "Montant convenu", clear: "Effacer", signHelp: "Signez avec votre doigt ou votre souris.", accept: "J’ai lu et j’accepte les règles du séjour et je confirme que les informations fournies sont exactes.", submit: "Signer et générer mon contrat", sending: "Enregistrement du contrat…",
    rulesList: ["Check-in à partir de 14:00", "Check-out avant 11:00", "Interdiction de fumer à l’intérieur", "Pas de bruit excessif après 23:00", "Seules les personnes déclarées sont autorisées", "Toute dégradation peut être facturée"],
    signedTitle: "Votre contrat de séjour est signé", signedIntro: "Votre signature électronique et vos informations d’identité ont été enregistrées de façon sécurisée.", signedOn: "Signé le", print: "Imprimer ou enregistrer en PDF", loadError: "Ce lien de contrat est invalide, expiré ou momentanément indisponible.", submitError: "Le contrat n’a pas pu être enregistré. Vérifiez les champs et réessayez.", signatureRequired: "Veuillez ajouter votre signature avant de continuer.",
  },
  ar: {
    eyebrow: "عقد إلكتروني آمن", title: "أكمل عقد إقامتك", intro: "راجع حجزك المؤكد، أكمل معلومات هويتك ووقّع قبل الوصول.",
    secure: "بيانات خاصة", signature: "توقيع إلكتروني", digital: "عقد رقمي", client: "معلومات العميل", stay: "تفاصيل الإقامة", rules: "قواعد الإقامة", sign: "توقيع العميل",
    name: "الاسم الكامل", phone: "الهاتف / واتساب", email: "البريد الإلكتروني", nationality: "الجنسية", identity: "رقم البطاقة / جواز السفر", birth: "تاريخ الميلاد", address: "العنوان الحالي", document: "نسخة البطاقة / جواز السفر", documentHelp: "JPG أو PNG أو PDF · بحد أقصى 5 MB", arrival: "وقت الوصول المتوقع",
    property: "العقار", guests: "المسافرون", checkIn: "الوصول", checkOut: "المغادرة", reference: "مرجع الحجز", total: "المبلغ المتفق عليه", clear: "مسح", signHelp: "وقّع بإصبعك أو بالفأرة.", accept: "قرأت قواعد الإقامة وأوافق عليها وأؤكد صحة المعلومات المقدمة.", submit: "توقيع وإنشاء العقد", sending: "جاري حفظ العقد…",
    rulesList: ["تسجيل الدخول ابتداءً من 14:00", "تسجيل الخروج قبل 11:00", "ممنوع التدخين في الداخل", "ممنوع الضجيج بعد 23:00", "يسمح فقط للأشخاص المصرح بهم", "يمكن احتساب تكلفة الأضرار"],
    signedTitle: "تم توقيع عقد إقامتك", signedIntro: "تم تسجيل توقيعك الإلكتروني ومعلومات هويتك بشكل آمن.", signedOn: "تم التوقيع في", print: "طباعة أو حفظ PDF", loadError: "رابط العقد غير صالح أو منتهي الصلاحية أو غير متاح مؤقتاً.", submitError: "تعذر حفظ العقد. تحقق من المعلومات وحاول مرة أخرى.", signatureRequired: "المرجو إضافة توقيعك قبل المتابعة.",
  },
} as const;

export function StayContractPage({ token, initialContract }: { token: string; initialContract?: StayContractData }) {
  const locale = useLocale();
  const t = copy[locale as keyof typeof copy] ?? copy.fr;
  const [contract, setContract] = useState<StayContractData | null>(initialContract ?? null);
  const [loading, setLoading] = useState(!initialContract);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (initialContract) return;
    getStayContract(token).then(setContract).catch(() => setFailure(t.loadError)).finally(() => setLoading(false));
  }, [initialContract, token, t.loadError]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || contract?.status === "signed") return;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const context = canvas.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (context) { context.lineWidth = 2; context.lineCap = "round"; context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-text"); }
      setHasSignature(false);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [contract?.status]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const context = event.currentTarget.getContext("2d");
    context?.beginPath(); context?.moveTo(p.x, p.y);
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const p = point(event);
    const context = event.currentTarget.getContext("2d");
    context?.lineTo(p.x, p.y); context?.stroke();
    setHasSignature(true);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasSignature || !canvasRef.current) { setFailure(t.signatureRequired); return; }
    const form = new FormData(event.currentTarget);
    form.set("signature", canvasRef.current.toDataURL("image/png"));
    form.set("accept_terms", "1");
    setBusy(true); setFailure(""); setErrors({});
    try { setContract(await signStayContract(token, form)); }
    catch (error) {
      if (error instanceof ApiError) setErrors(Object.fromEntries(Object.entries(error.errors).map(([key, values]) => [key, values[0]])));
      setFailure(t.submitError);
    } finally { setBusy(false); }
  }

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-20"><div className="skeleton h-80 rounded-2xl" /></div>;
  if (!contract) return <div className="mx-auto max-w-3xl px-4 py-20"><div className="rounded-2xl border border-error/30 bg-error-surface p-8 text-center text-error">{failure || t.loadError}</div></div>;
  if (contract.status === "signed") return <SignedContract contract={contract} labels={t} />;

  return <div className="bg-surface-muted py-10 print:bg-white" dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className="mx-auto max-w-5xl px-4">
      <header className="rounded-2xl border border-border bg-surface p-6 shadow-md sm:p-8">
        <span className="text-sm font-semibold text-gold-primary">{t.eyebrow}</span>
        <h1 className="mt-2 font-display text-3xl font-semibold text-text sm:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-2xl text-text-muted">{t.intro}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs"><Badge icon={<LockKeyhole size={14} />} text={t.secure} /><Badge icon={<PenLine size={14} />} text={t.signature} /><Badge icon={<FileCheck2 size={14} />} text={t.digital} /></div>
      </header>

      <form onSubmit={submit} className="mt-6 space-y-5">
        <Section number="1" title={t.client}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label={t.name} value={contract.guest.name} /><ReadOnly label={t.phone} value={contract.guest.phone} />
            <ReadOnly label={t.email} value={contract.guest.email} />
            <Input label={t.nationality} name="nationality" required error={errors.nationality} />
            <Input label={t.identity} name="identity_number" required error={errors.identity_number} />
            <Input label={t.birth} name="birth_date" type="date" required error={errors.birth_date} />
            <div className="sm:col-span-2"><Input label={t.address} name="address" required error={errors.address} /></div>
            <div className="sm:col-span-2"><label className="text-sm font-semibold text-text">{t.document} *</label><label className="mt-2 flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface-muted px-4 py-7 text-sm text-text-muted hover:border-gold-primary"><Upload size={20} className="text-gold-primary" /><span>{t.documentHelp}</span><input className="sr-only" type="file" name="identity_document" accept="image/jpeg,image/png,application/pdf" required /></label>{errors.identity_document && <p className="mt-1 text-xs text-error">{errors.identity_document}</p>}</div>
          </div>
        </Section>

        <Section number="2" title={t.stay}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly label={t.property} value={contract.stay.property_title} /><ReadOnly label={t.guests} value={String(contract.stay.guests_count)} icon={<UsersRound size={16} />} />
            <ReadOnly label={t.checkIn} value={contract.stay.check_in_date} icon={<CalendarDays size={16} />} /><ReadOnly label={t.checkOut} value={contract.stay.check_out_date} icon={<CalendarDays size={16} />} />
            <ReadOnly label={t.reference} value={contract.reference} /><ReadOnly label={t.total} value={`${contract.stay.total_amount.toLocaleString(locale)} ${contract.stay.currency}`} />
            <Input label={t.arrival} name="estimated_arrival_time" type="time" icon={<Clock3 size={16} />} />
          </div>
        </Section>

        <Section number="3" title={t.rules}>
          <div className="grid gap-3 sm:grid-cols-2">{t.rulesList.map((rule) => <div key={rule} className="rounded-xl border border-border bg-surface-muted p-4 text-sm text-text">{rule}</div>)}</div>
          <label className="mt-5 flex items-start gap-3 text-sm text-text"><input type="checkbox" required className="mt-1 accent-[var(--color-gold-primary)]" /><ShieldCheck size={19} className="mt-0.5 shrink-0 text-gold-primary" />{t.accept}</label>
        </Section>

        <Section number="4" title={t.sign}>
          <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
            <canvas ref={canvasRef} className="h-48 w-full touch-none" onPointerDown={startDrawing} onPointerMove={draw} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
            <div className="flex justify-end border-t border-border bg-surface-muted p-2"><button type="button" onClick={clearSignature} className="rounded-lg px-4 py-2 text-sm font-semibold text-text hover:bg-surface">{t.clear}</button></div>
          </div>
          <p className="mt-2 text-xs text-text-muted">{t.signHelp}</p>{errors.signature && <p className="mt-1 text-xs text-error">{errors.signature}</p>}
        </Section>

        {failure && <p role="alert" className="rounded-xl bg-error-surface p-4 text-sm text-error">{failure}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-gradient-gold px-6 py-4 text-base font-bold text-ink shadow-gold disabled:opacity-50">{busy ? t.sending : t.submit}</button>
      </form>
    </div>
  </div>;
}

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7"><div className="mb-6 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-gold font-bold text-ink">{number}</span><h2 className="font-display text-xl font-semibold text-text">{title}</h2></div>{children}</section>;
}

function Badge({ icon, text }: { icon: ReactNode; text: string }) { return <span className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-white">{icon}{text}</span>; }
function ReadOnly({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) { return <div><p className="flex items-center gap-2 text-xs font-semibold text-text-muted">{icon}{label}</p><p className="mt-1 break-words font-semibold text-text">{value}</p></div>; }
function Input({ label, name, type = "text", required, error, icon }: { label: string; name: string; type?: string; required?: boolean; error?: string; icon?: ReactNode }) { return <label className="block text-sm font-semibold text-text"><span className="flex items-center gap-2">{icon}{label}{required && " *"}</span><input className="mt-2 w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-text focus:border-gold-primary" name={name} type={type} required={required} />{error && <span className="mt-1 block text-xs text-error">{error}</span>}</label>; }

function SignedContract({ contract, labels }: { contract: StayContractData; labels: (typeof copy)[keyof typeof copy] }) {
  return <div className="bg-surface-muted py-10 print:bg-white"><div className="mx-auto max-w-4xl px-4"><article className="rounded-2xl border border-border bg-surface p-6 shadow-lg print:border-0 print:shadow-none sm:p-10"><div className="flex flex-col gap-5 border-b border-gold-primary pb-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold tracking-widest text-gold-primary">KHADMATONA GROUP</p><h1 className="mt-2 font-display text-3xl font-semibold text-text">{labels.signedTitle}</h1><p className="mt-2 text-sm text-text-muted">{labels.signedIntro}</p></div><CheckCircle2 size={52} className="text-success" /></div><div className="mt-8 grid gap-7 sm:grid-cols-2"><div><h2 className="font-display text-xl font-semibold">{labels.client}</h2><div className="mt-4 space-y-3"><ReadOnly label={labels.name} value={contract.guest.name} /><ReadOnly label={labels.nationality} value={contract.contract?.nationality ?? ""} /><ReadOnly label={labels.identity} value={contract.contract?.identity_number ?? ""} /><ReadOnly label={labels.address} value={contract.contract?.address ?? ""} /></div></div><div><h2 className="font-display text-xl font-semibold">{labels.stay}</h2><div className="mt-4 space-y-3"><ReadOnly label={labels.property} value={contract.stay.property_title} /><ReadOnly label={labels.checkIn} value={contract.stay.check_in_date} /><ReadOnly label={labels.checkOut} value={contract.stay.check_out_date} /><ReadOnly label={labels.total} value={`${contract.stay.total_amount} MAD`} /></div></div></div><div className="mt-8 border-t border-border pt-5 text-sm text-text-muted">{labels.signedOn}: {contract.contract ? new Date(contract.contract.signed_at).toLocaleString() : ""} · {labels.reference}: {contract.reference}</div><button type="button" onClick={() => window.print()} className="mt-7 rounded-xl bg-gradient-gold px-6 py-3 font-bold text-ink print:hidden">{labels.print}</button></article></div></div>;
}
