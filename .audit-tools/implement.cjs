const fs = require('fs');
const root = 'B:/KHADMATONA-/';
function edit(path, fn) { const p=root+path; const old=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'); fs.writeFileSync(p,fn(old)); }
function replace(s, from, to) { if(!s.includes(from)) throw new Error('Missing text: '+from.slice(0,100)); return s.replace(from,to); }
const ui='frontend/admin/src/';
if (false) {
for(const resource of ['PropertyResource','DashboardPropertyResource']) edit(`backend/app/Modules/Property/Http/Resources/${resource}.php`,s=>replace(s,"'status' => $this->status->value,","'status' => $this->status->value,\n            'transaction_type' => $this->transaction_type,\n            'price_period' => $this->price_period,"));
edit('backend/app/Modules/Property/Domain/Models/Property.php',s=>replace(s,"'status',","'status',\n        'transaction_type',\n        'price_period',"));
for(const request of ['StorePropertyRequest','UpdatePropertyRequest']) edit(`backend/app/Modules/Property/Http/Requests/${request}.php`,s=>replace(s,"'title' => ['required', 'string', 'max:255'],","'title' => ['required', 'string', 'max:255'],\n            'transaction_type' => ['nullable', Rule::in(['sale', 'rent'])],\n            'price_period' => ['nullable', 'required_if:transaction_type,rent', 'prohibited_unless:transaction_type,rent', Rule::in(['month', 'night'])],"));
edit('backend/app/Modules/Property/Http/Filters/PropertyFilter.php',s=>replace(s,"'status',","'status',\n            AllowedFilter::exact('transaction_type'),\n            AllowedFilter::exact('price_period'),"));
edit(ui+'types/property.ts',s=>s.replaceAll('  status: PropertyStatus;','  status: PropertyStatus;\n  transaction_type?: "sale" | "rent" | null;\n  price_period?: "month" | "night" | null;'));
edit(ui+'lib/properties.ts',s=>{
 s=replace(s,'  sort?: string;','  sort?: string;\n  transactionType?: "sale" | "rent";\n  pricePeriod?: "month" | "night";');
 s=s.replaceAll('  if (params.search) query.set("filter[search]", params.search);','  if (params.transactionType) query.set("filter[transaction_type]", params.transactionType);\n  if (params.pricePeriod) query.set("filter[price_period]", params.pricePeriod);\n  if (params.search) query.set("filter[search]", params.search);');
 // Facets also uses params; keep its type compatible with the common query fields.
 s=s.replace('"search" | "type" | "status" | "cityId" | "priceMin" | "priceMax"','"search" | "type" | "status" | "cityId" | "priceMin" | "priceMax" | "transactionType" | "pricePeriod"');
 return replace(s,'  form.set("status", values.status);','  form.set("status", values.status);\n  form.set("transaction_type", values.transaction_type ?? "");\n  form.set("price_period", values.transaction_type === "rent" ? values.price_period ?? "" : "");');
});
}
edit(ui+'components/properties/property-form.tsx',s=>{
 s=replace(s,'  const t = useTranslations("PropertyForm");','  const t = useTranslations("PropertyForm");\n  const ux = useTranslations("PublicUx");');
 const marker='      <Field\n';
 const pos=s.indexOf(marker,s.indexOf('return (',s.indexOf('async function removeSavedImage')));
 if(pos<0) throw new Error('Form field not found');
 const fields=`      <Select name="transaction_type" label={ux("transaction")} value={values.transaction_type ?? ""} onChange={event => setValues(current => ({ ...current, transaction_type: (event.target.value || null) as PropertyFormValues["transaction_type"], price_period: event.target.value === "rent" ? current.price_period ?? "month" : null }))} error={fieldErrors.transaction_type}><option value="">{ux("unspecified")}</option><option value="sale">{ux("buy")}</option><option value="rent">{ux("rent")}</option></Select>\n      {values.transaction_type === "rent" && <Select name="price_period" label={ux("pricePeriod")} value={values.price_period ?? "month"} onChange={event => set("price_period", event.target.value as "month" | "night")} error={fieldErrors.price_period}><option value="month">{ux("month")}</option><option value="night">{ux("night")}</option></Select>}\n`;
 return s.slice(0,pos)+fields+s.slice(pos);
});
edit(ui+'components/properties/property-edit-content.tsx',s=>replace(s,'          status: property.status,','          status: property.status,\n          transaction_type: property.transaction_type ?? null,\n          price_period: property.price_period ?? null,'));
edit(ui+'components/properties/property-card.tsx',s=>{
 s=replace(s,'import { MapPin }','import { PropertyImage } from "@/components/properties/property-image";\nimport { PropertyPrice } from "@/components/properties/property-price";\nimport { MapPin }');
 s=s.replace(/const currencyFormatter = new Intl.NumberFormat\("fr-FR", \{[\s\S]*?\}\);\n/, '');
 const start=s.indexOf('        {property.cover_image && ('); const end=s.indexOf('        {showStatus',start);
 s=s.slice(0,start)+'        <PropertyImage src={property.cover_image} alt={property.title} className="transition-transform duration-300 group-hover:scale-105" />\n'+s.slice(end);
 return replace(s,'{currencyFormatter.format(property.price)} DH','<PropertyPrice property={property} />');
});
edit(ui+'components/properties/property-gallery.tsx',s=>{
 s=replace(s,'import type { PropertyImage }','import { PropertyImage as GalleryImage } from "@/components/properties/property-image";\nimport type { PropertyImage }');
 const start=s.indexOf('          // eslint-disable-next-line @next/next/no-img-element'); const end=s.indexOf('\n        ) : (',start);
 s=s.slice(0,start)+'          <GalleryImage src={active.url} alt={title} priority />'+s.slice(end);
 return s.replaceAll('opacity-0 transition-opacity group-hover:opacity-100','opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100');
});
edit(ui+'components/rental/booking-property-list.tsx',s=>{
 s=s.replace('import Image from "next/image";','import { PropertyImage } from "@/components/properties/property-image";').replace('Building2, MapPin','MapPin');
 const start=s.indexOf('{property.cover_image ? <Image'); const end=s.indexOf('</div>',start);
 return s.slice(0,start)+'<PropertyImage src={property.cover_image} alt={property.title} className="transition-transform duration-300 group-hover:scale-105" />'+s.slice(end);
});
edit(ui+'app/(public)/properties/[id]/page.tsx',s=>{
 s=s.replace('import { VisitBookingForm } from "@/components/visits/visit-booking-form";','import { PropertyInquiry } from "@/components/properties/property-inquiry";\nimport { PropertyPrice } from "@/components/properties/property-price";').replace('import { PublicBookingForm } from "@/components/rental/public-booking-form";\n','');
 s=s.replace(/const currencyFormatter = new Intl.NumberFormat\("fr-FR", \{ maximumFractionDigits: 0 \}\);\n/,'');
 s=replace(s,'lg:grid-cols-3','lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,1fr)]').replace('lg:col-span-2','min-w-0');
 s=replace(s,'{currencyFormatter.format(property.price)}{" "}\n          <span className="text-sm font-semibold text-text-muted">DH</span>','<PropertyPrice property={property} />');
 s=replace(s,'whitespace-pre-line text-[0.95rem]','whitespace-pre-line text-base').replace('className="text-[0.95rem] leading-relaxed text-text"','className="whitespace-pre-line text-base leading-relaxed text-text"');
 const start=s.indexOf('          <div id="booking"'); const end=s.indexOf('\n        </div>',start);
 return s.slice(0,start)+'          <PropertyInquiry propertyId={property.id} title={property.title} stay={stay} available={property.status === "disponible"} />'+s.slice(end);
});
edit(ui+'components/rental/public-booking-form.tsx',s=>{
 s=replace(s,'export function PublicBookingForm({ propertyId }: { propertyId: number })','export function PublicBookingForm({ propertyId, onEligibility }: { propertyId: number; onEligibility?: (bookable: boolean) => void })');
 s=replace(s,'if (!cancelled) setEligibility({ propertyId, bookable: result.bookable, error: "" });','if (!cancelled) { setEligibility({ propertyId, bookable: result.bookable, error: "" }); onEligibility?.(result.bookable); }');
 s=s.replace('[propertyId, version, t]);','[propertyId, version, t, onEligibility]);');
 s=replace(s,'<p className="text-sm text-text-muted">{t("receivedHint")}</p>','<p className="text-sm text-text-muted">{t("receivedHint")}</p><p className="font-mono font-semibold" dir="ltr">{reference}</p>');
 return s.replace('grid sm:grid-cols-2','grid grid-cols-1').replace('sm:border-e sm:border-b-0','').replace('grid gap-4 xl:grid-cols-2','grid gap-4');
});
edit(ui+'components/visits/visit-booking-form.tsx',s=>s.replace('grid-cols-1 gap-4 sm:grid-cols-2','grid-cols-1 gap-4'));
// Share settings across metadata, header, page and footer within a render; never cache across locales/users.
edit(ui+'lib/settings.ts',s=>replace(s,'export function getSettings(): Promise<Settings> {\n  return api.get<Settings>("/api/v1/settings");\n}','export const getSettings = cache((): Promise<Settings> => api.get<Settings>("/api/v1/settings"));').replace('import { api }','import { cache } from "react";\nimport { api }'));
// Remove synthetic customer portraits and rating claims; use a neutral service badge.
edit(ui+'components/home/social-proof-badge.tsx',()=>`import { useTranslations } from "next-intl";\nimport { Headset } from "lucide-react";\nexport function SocialProofBadge({ className = "", style }: { clientsCount: string; className?: string; style?: React.CSSProperties }) { const t = useTranslations("PublicUx"); return <p className={\`relative z-10 flex w-fit items-center gap-3 rounded-xl bg-ink/80 px-4 py-3 text-sm font-semibold text-white \${className}\`} style={style}><Headset size={20} className="text-gold-secondary" aria-hidden="true" />{t("personalSupport")}</p>; }\n`);
edit(ui+'app/(public)/page.tsx',s=>{
 const start=s.indexOf('      <section className="px-4 py-14'); const end=s.indexOf('      <TestimonialsSection />',start);
 const featured=s.slice(start,end); s=s.slice(0,start)+s.slice(end);
 const insertion=s.indexOf('      <section className="border-y'); s=s.slice(0,insertion)+featured+s.slice(insertion);
 s=s.replaceAll('showStatus={false}','showStatus');
 // One source for each stat, both at the top and in the CTA band.
 s=s.replaceAll('settings.stat1_value','settings.cta_stat1_value').replaceAll('settings.stat1_label','settings.cta_stat1_label').replaceAll('settings.stat2_value','settings.cta_stat2_value').replaceAll('settings.stat2_label','settings.cta_stat2_label').replaceAll('settings.stat3_value','settings.cta_stat3_value').replaceAll('settings.stat3_label','settings.cta_stat3_label').replaceAll('settings.stat4_value','settings.cta_stat4_value').replaceAll('settings.stat4_label','settings.cta_stat4_label');
 return s.replaceAll('sm:mb-20','sm:mb-10').replaceAll('sm:py-20','sm:py-14').replaceAll('text-[0.8rem] leading-relaxed','text-sm leading-relaxed');
});
// Mobile menu uses a modal primitive for inert siblings, focus trapping and focus restoration.
edit(ui+'components/layout/site-header-client.tsx',s=>{
 s=replace(s,'import clsx from "clsx";','import clsx from "clsx";\nimport * as Dialog from "@radix-ui/react-dialog";');
 s=replace(s,'    <header className=','    <Dialog.Root open={open} onOpenChange={setOpen}><header className=');
 s=replace(s,'          <button\n            type="button"\n            onClick={() => setOpen(true)}','          <Dialog.Trigger asChild><button\n            type="button"');
 s=replace(s,'            <MenuIcon />\n          </button>','            <MenuIcon />\n          </button></Dialog.Trigger>');
 const start=s.indexOf('      <div\n        aria-hidden="true"'); const end=s.indexOf('        <div className="mb-4',start);
 s=s.slice(0,start)+`      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-[2px]" />\n      <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 end-0 z-50 flex w-80 max-w-[90vw] flex-col gap-1 overflow-y-auto bg-surface p-5 text-text shadow-2xl">\n`+s.slice(end);
 s=replace(s,'<span className="font-display text-lg font-semibold text-text">{t("menu")}</span>','<Dialog.Title className="font-display text-lg font-semibold text-text">{t("menu")}</Dialog.Title>');
 s=replace(s,'      </div>\n    </header>','      </Dialog.Content></Dialog.Portal>\n    </header></Dialog.Root>');
 // Close mobile modal when resizing into desktop navigation.
 const effect='  // Body scroll lock';
 s=replace(s,effect,'  useEffect(() => { const query = window.matchMedia("(min-width: 1024px)"); const close = () => { if (query.matches) setOpen(false); }; query.addEventListener("change", close); return () => query.removeEventListener("change", close); }, []);\n\n'+effect);
 return s;
});
console.log('Implementation edits applied');
