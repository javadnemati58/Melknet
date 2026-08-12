import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const requestTypes = [
  { key: "buyer", title: "خریدار", description: "دنبال خرید ملک هستم", icon: "🏠" },
  { key: "seller", title: "فروشنده", description: "می‌خواهم ملکم را بفروشم", icon: "🏢" },
  { key: "landlord", title: "موجر", description: "ملکم را برای اجاره دارم", icon: "🔑" },
  { key: "tenant", title: "مستأجر", description: "دنبال ملک برای اجاره هستم", icon: "🔎" },
];

const initialForm = {
  city: "", area: "", neighborhood: "", address: "", propertyType: "",
  areaMeters: "", bedrooms: "", floor: "", totalFloors: "",
  buildingDirection: "", complexUnits: "", yearBuilt: "",
  parking: null, elevator: null, storage: null,
  pricePerMeter: "", totalPrice: "", deposit: "", rent: "",
  exchange: false, exchangeWith: "", description: "", name: "", phone: "",
};

const ones = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const teens = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const tens = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const hundreds = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const scales = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کوادریلیون"];

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value) {
  return String(value ?? "")
    .replace(/[۰-۹]/g, d => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(ARABIC_DIGITS.indexOf(d)));
}

function digitsOnly(value) {
  return normalizeDigits(value).replace(/\D/g, "");
}

function lettersOnly(value) {
  return String(value ?? "").replace(/[^A-Za-z\u0600-\u06FF\s'-]/g, "");
}

function safeText(value) {
  return String(value ?? "").replace(/[<>]/g, "");
}

function rawMoney(value) {
  return digitsOnly(value);
}

function formatMoney(value) {
  const raw = rawMoney(value);
  return raw ? Number(raw).toLocaleString("en-US") : "";
}

function threeWords(n) {
  n = Number(n);
  if (!n) return "";
  const parts = [];
  const h = Math.floor(n / 100);
  const r = n % 100;

  if (h) parts.push(hundreds[h]);

  if (r) {
    if (r < 10) parts.push(ones[r]);
    else if (r < 20) parts.push(teens[r - 10]);
    else {
      parts.push(tens[Math.floor(r / 10)]);
      if (r % 10) parts.push(ones[r % 10]);
    }
  }

  return parts.join(" و ");
}

function numberToWords(value) {
  const raw = rawMoney(value);
  if (!raw || Number(raw) === 0) return "صفر";

  const groups = [];
  let s = raw;

  while (s.length) {
    groups.unshift(Number(s.slice(-3)));
    s = s.slice(0, -3);
  }

  return groups
    .map((group, index) => {
      if (!group) return "";
      const scale = scales[groups.length - index - 1] || "";
      return `${threeWords(group)}${scale ? ` ${scale}` : ""}`;
    })
    .filter(Boolean)
    .join(" و ");
}

function validName(value) {
  const v = String(value ?? "").trim();
  return v.length >= 3 && /^[A-Za-z\u0600-\u06FF\s'-]+$/.test(v);
}

function validPhone(value) {
  return /^09\d{9}$/.test(normalizeDigits(value).replace(/\s/g, ""));
}

function validLocation(value) {
  const v = String(value ?? "").trim();
  return v.length >= 2 && /[A-Za-z\u0600-\u06FF]/.test(v);
}

function validAddress(value) {
  const v = String(value ?? "").trim();
  return v.length >= 5 && /[A-Za-z\u0600-\u06FF]/.test(v);
}

function positiveNumber(value) {
  const n = Number(digitsOnly(value));
  return Number.isFinite(n) && n > 0;
}

function nonNegativeNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  return Number.isFinite(Number(digitsOnly(raw)));
}

function validateForm(form, type) {
  const errors = {};

  if (!validName(form.name)) errors.name = "نام و نام خانوادگی باید فقط شامل حروف باشد.";
  if (!validPhone(form.phone)) errors.phone = "شماره موبایل باید دقیقاً ۱۱ رقم و با 09 شروع شود.";
  if (!validLocation(form.city)) errors.city = "شهر را صحیح وارد کنید.";
  if (!validLocation(form.area)) errors.area = "منطقه را صحیح وارد کنید.";
  if (!validLocation(form.neighborhood)) errors.neighborhood = "محله را صحیح وارد کنید.";
  if (!validAddress(form.address)) errors.address = "آدرس باید شامل متن باشد و فقط عدد نباشد.";
  if (!form.propertyType) errors.propertyType = "نوع ملک را انتخاب کنید.";
  if (!positiveNumber(form.areaMeters)) errors.areaMeters = "متراژ باید بزرگ‌تر از صفر باشد.";

  if (form.bedrooms !== "") {
    const n = Number(digitsOnly(form.bedrooms));
    if (!Number.isInteger(n) || n < 0 || n > 20) errors.bedrooms = "تعداد خواب باید بین ۰ تا ۲۰ باشد.";
  }

  if (form.floor !== "") {
    const n = Number(normalizeDigits(form.floor));
    if (!Number.isInteger(n) || n < -2 || n > 100) errors.floor = "طبقه باید بین ۲- تا ۱۰۰ باشد.";
  }

  if (form.totalFloors !== "") {
    const n = Number(digitsOnly(form.totalFloors));
    if (!Number.isInteger(n) || n < 1 || n > 100) errors.totalFloors = "تعداد طبقات باید بین ۱ تا ۱۰۰ باشد.";
  }

  if (form.complexUnits !== "") {
    const n = Number(digitsOnly(form.complexUnits));
    if (!Number.isInteger(n) || n < 1 || n > 2000) errors.complexUnits = "تعداد واحد باید بین ۱ تا ۲۰۰۰ باشد.";
  }

  if (form.yearBuilt !== "") {
    const n = Number(digitsOnly(form.yearBuilt));
    const currentPersianYear = Number(
      normalizeDigits(
        new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
          year: "numeric",
        }).format(new Date())
      )
    );

    if (
      !Number.isInteger(n) ||
      n < 1300 ||
      n > currentPersianYear
    ) {
      errors.yearBuilt = `سال ساخت باید بین ۱۳۰۰ تا ${currentPersianYear} باشد و نمی‌تواند از سال جاری بیشتر باشد.`;
    }
  }

  if (type === "seller") {
    if (!positiveNumber(form.pricePerMeter) && !positiveNumber(form.totalPrice))
      errors.price = "حداقل یکی از قیمت هر متر یا قیمت کل را وارد کنید.";
    if (!nonNegativeNumber(form.pricePerMeter) || !nonNegativeNumber(form.totalPrice))
      errors.price = "مبلغ قیمت نامعتبر است.";
    if (form.exchange && String(form.exchangeWith).trim().length < 3)
      errors.exchangeWith = "مورد معاوضه را وارد کنید.";
  }

  if (type === "landlord" || type === "tenant") {
    if (!positiveNumber(form.deposit) && !positiveNumber(form.rent))
      errors.rent = "حداقل یکی از رهن یا اجاره را وارد کنید.";
  }

  if (type === "buyer" && !positiveNumber(form.totalPrice))
    errors.totalPrice = "بودجه خرید باید بزرگ‌تر از صفر باشد.";

  if (form.description.trim() && form.description.trim().length < 5)
    errors.description = "توضیحات باید حداقل ۵ کاراکتر باشد.";

  return errors;
}

function ErrorText({ message }) {
  return message ? <p className="mt-1 text-xs font-semibold text-red-600">{message}</p> : null;
}

function Field({ label, value, onChange, type = "text", placeholder = "", error, fieldKey, inputMode }) {
  return (
    <div data-field={fieldKey}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border ${error ? "border-red-400" : "border-slate-300"} bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100`}
      />
      <ErrorText message={error} />
    </div>
  );
}

function SelectField({ label, value, onChange, options, error, fieldKey }) {
  return (
    <div data-field={fieldKey}>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full rounded-xl border ${error ? "border-red-400" : "border-slate-300"} bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100`}
      >
        <option value="">انتخاب کنید</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <ErrorText message={error} />
    </div>
  );
}

function BooleanField({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            value === true
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-emerald-300"
          }`}
        >
          دارد
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            value === false
              ? "border-slate-700 bg-slate-700 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
          }`}
        >
          ندارد
        </button>
      </div>
    </div>
  );
}

function MoneyInput({ label, value, onChange, error, fieldKey }) {
  const raw = rawMoney(value);

  return (
    <div data-field={fieldKey}>
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="min-h-5 text-xs font-medium text-emerald-700">
        {raw ? `${numberToWords(raw)} تومان` : ""}
      </div>
      <div className="relative">
        <input
          inputMode="numeric"
          value={formatMoney(value)}
          onChange={e => onChange(rawMoney(e.target.value))}
          placeholder="مبلغ را وارد کنید"
          dir="ltr"
          className={`w-full rounded-xl border ${error ? "border-red-400" : "border-slate-300"} bg-white px-4 py-3 pl-16 text-left text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100`}
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">تومان</span>
      </div>
      <ErrorText message={error} />
    </div>
  );
}

function CustomerApp() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const setField = (key, value) => {
    let next = value;

    if (["name", "city", "area", "neighborhood"].includes(key))
      next = lettersOnly(value);

    if (["phone", "bedrooms", "totalFloors", "complexUnits", "yearBuilt"].includes(key))
      next = digitsOnly(value);

    if (key === "floor") {
      next = normalizeDigits(value).replace(/[^0-9-]/g, "");
      if (next.includes("-")) next = "-" + next.replace(/-/g, "");
    }

    if (["address", "description", "exchangeWith"].includes(key))
      next = safeText(value);

    setForm(prev => ({ ...prev, [key]: next }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
    setSubmitted(false);
  };

  const updateSellerMoney = (field, value) => {
    const next = { ...form, [field]: rawMoney(value) };
    const meters = Number(rawMoney(next.areaMeters));

    if (field === "totalPrice" && meters > 0)
      next.pricePerMeter = String(Math.round(Number(next.totalPrice || 0) / meters));

    if (field === "pricePerMeter" && meters > 0)
      next.totalPrice = String(Math.round(Number(next.pricePerMeter || 0) * meters));

    setForm(next);
    setErrors(prev => ({ ...prev, price: undefined }));
    setSubmitted(false);
  };

  const calculatedPricePerMeter = useMemo(() => {
    const m = Number(rawMoney(form.areaMeters));
    const t = Number(rawMoney(form.totalPrice));
    return m > 0 && t > 0 ? Math.round(t / m) : 0;
  }, [form.areaMeters, form.totalPrice]);

  const calculatedTotalPrice = useMemo(() => {
    const m = Number(rawMoney(form.areaMeters));
    const p = Number(rawMoney(form.pricePerMeter));
    return m > 0 && p > 0 ? Math.round(m * p) : 0;
  }, [form.areaMeters, form.pricePerMeter]);

  const openForm = key => {
    setActiveType(key);
    setForm(initialForm);
    setErrors({});
    setSubmitted(false);
  };

  const closeForm = () => {
    setActiveType(null);
    setErrors({});
    setSubmitted(false);
  };

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const submitRequest = async e => {
    e.preventDefault();

    const validationErrors = validateForm(form, activeType);
    setErrors(validationErrors);
    setSaveError("");

    if (Object.keys(validationErrors).length) {
      setSubmitted(false);
      const first = Object.keys(validationErrors)[0];
      setTimeout(() => {
        document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 0);
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      setSaveError("تنظیمات اتصال به پایگاه داده در فایل .env.local کامل نیست.");
      setSubmitted(false);
      return;
    }

    setSaving(true);

    const type = requestTypes.find(x => x.key === activeType);

    const requestNumber = Date.now();

    const payload = {
      request_number: requestNumber,
      request_type: type?.title || "",
      request_type_id: activeType,
      status: "جدید",
      name: form.name.trim(),
      phone: normalizeDigits(form.phone).replace(/\s/g, ""),
      city: form.city.trim(),
      area: form.area.trim(),
      neighborhood: form.neighborhood.trim(),
      address: form.address.trim(),
      property_type: form.propertyType,
      area_size: Number(digitsOnly(form.areaMeters)),
      bedrooms: form.bedrooms === "" ? null : Number(digitsOnly(form.bedrooms)),
      build_year: form.yearBuilt === "" ? null : Number(digitsOnly(form.yearBuilt)),
      floor: form.floor === "" ? null : Number(normalizeDigits(form.floor)),
      total_floors: form.totalFloors === "" ? null : Number(digitsOnly(form.totalFloors)),
      building_units: form.complexUnits === "" ? null : Number(digitsOnly(form.complexUnits)),
      direction: form.buildingDirection.trim(),
      parking: typeof form.parking === "boolean" ? form.parking : null,
      storage: typeof form.storage === "boolean" ? form.storage : null,
      elevator: typeof form.elevator === "boolean" ? form.elevator : null,
      budget: activeType === "buyer" ? Number(digitsOnly(form.totalPrice)) : null,
      price_per_meter: form.pricePerMeter ? Number(digitsOnly(form.pricePerMeter)) : null,
      total_price: form.totalPrice ? Number(digitsOnly(form.totalPrice)) : null,
      exchange: Boolean(form.exchange),
      exchange_with: form.exchange ? form.exchangeWith.trim() : "",
      deposit: form.deposit ? Number(digitsOnly(form.deposit)) : null,
      rent: form.rent ? Number(digitsOnly(form.rent)) : null,
      description: form.description.trim(),
    };

    const { error } = await supabase.from("requests").insert(payload);

    setSaving(false);

    if (error) {
      console.error("Supabase insert error:", error);
      setSubmitted(false);
      setSaveError(`ذخیره درخواست انجام نشد: ${error.message}`);
      return;
    }

    setSubmitted(true);
    setForm(initialForm);
  };

  const activeTitle = requestTypes.find(x => x.key === activeType)?.title;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800">
      {activeType && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
            <button onClick={closeForm} className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <span>←</span>
              بازگشت
            </button>
            <div className="font-black text-slate-900">ملک‌نت</div>
          </div>
        </header>
      )}

      {!activeType ? (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
          <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
            <div className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
              {requestTypes.map(item => (
                <button
                  key={item.key}
                  onClick={() => openForm(item.key)}
                  className="group flex min-h-36 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-lg active:translate-y-0"
                >
                  <div className="text-4xl transition group-hover:scale-110">{item.icon}</div>
                  <div className="mt-4 text-2xl font-black text-slate-900">{item.title}</div>
                </button>
              ))}
            </div>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <button onClick={closeForm} className="mb-5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">← بازگشت</button>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="mb-8 border-b border-slate-100 pb-5">
              <h1 className="text-2xl font-black text-slate-900">فرم ثبت درخواست {activeTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">اطلاعات با کنترل فرمت و اعتبار وارد می‌شوند.</p>
            </div>

            <form onSubmit={submitRequest} className="space-y-8">
              <section>
                <h2 className="mb-4 text-lg font-extrabold text-slate-900">اطلاعات تماس و موقعیت</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field fieldKey="name" error={errors.name} label="نام و نام خانوادگی" value={form.name} onChange={v => setField("name", v)} />
                  <Field fieldKey="phone" error={errors.phone} label="شماره موبایل" value={form.phone} onChange={v => setField("phone", v)} inputMode="numeric" />
                  <Field fieldKey="city" error={errors.city} label="شهر" value={form.city} onChange={v => setField("city", v)} />
                  <Field fieldKey="area" error={errors.area} label="منطقه" value={form.area} onChange={v => setField("area", v)} />
                  <Field fieldKey="neighborhood" error={errors.neighborhood} label="محله" value={form.neighborhood} onChange={v => setField("neighborhood", v)} />
                  <Field fieldKey="address" error={errors.address} label="آدرس / محدوده" value={form.address} onChange={v => setField("address", v)} />
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-lg font-extrabold text-slate-900">مشخصات ملک</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <SelectField fieldKey="propertyType" error={errors.propertyType} label="نوع ملک" value={form.propertyType} onChange={v => setField("propertyType", v)} options={["آپارتمان", "خانه", "ویلایی", "زمین", "مغازه", "دفتر", "سایر"]} />
                  <Field fieldKey="areaMeters" error={errors.areaMeters} label="متراژ (متر)" value={form.areaMeters} onChange={v => setField("areaMeters", v)} inputMode="numeric" />
                  <Field fieldKey="bedrooms" error={errors.bedrooms} label="تعداد خواب" value={form.bedrooms} onChange={v => setField("bedrooms", v)} inputMode="numeric" />
                  <Field fieldKey="floor" error={errors.floor} label="طبقه" value={form.floor} onChange={v => setField("floor", v)} inputMode="numeric" />
                  <Field fieldKey="totalFloors" error={errors.totalFloors} label="تعداد طبقات ساختمان" value={form.totalFloors} onChange={v => setField("totalFloors", v)} inputMode="numeric" />
                  <SelectField
                    fieldKey="buildingDirection"
                    error={errors.buildingDirection}
                    label="جهت ساختمان"
                    value={form.buildingDirection}
                    onChange={v => setField("buildingDirection", v)}
                    options={[
                      "شمالی",
                      "جنوبی",
                      "شرقی",
                      "غربی",
                      "شمالی-شرقی",
                      "شمالی-غربی",
                      "جنوبی-شرقی",
                      "جنوبی-غربی",
                      "شمالی-جنوبی",
                      "شرقی-غربی",
                      "سایر",
                    ]}
                  />
                  <Field fieldKey="complexUnits" error={errors.complexUnits} label="تعداد واحد مجتمع" value={form.complexUnits} onChange={v => setField("complexUnits", v)} inputMode="numeric" />
                  <Field fieldKey="yearBuilt" error={errors.yearBuilt} label="سال ساخت" value={form.yearBuilt} onChange={v => setField("yearBuilt", v)} inputMode="numeric" />
                  <BooleanField label="پارکینگ" value={form.parking} onChange={v => setField("parking", v)} />
                  <BooleanField label="آسانسور" value={form.elevator} onChange={v => setField("elevator", v)} />
                  <BooleanField label="انباری" value={form.storage} onChange={v => setField("storage", v)} />
                </div>
              </section>

              {activeType === "seller" && (
                <section className="rounded-2xl bg-slate-50 p-5">
                  <h2 className="mb-5 text-lg font-extrabold text-slate-900">قیمت فروش</h2>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <MoneyInput fieldKey="price" error={errors.price} label="قیمت هر متر" value={form.pricePerMeter} onChange={v => updateSellerMoney("pricePerMeter", v)} />
                    <MoneyInput fieldKey="price" error={errors.price} label="قیمت کل" value={form.totalPrice} onChange={v => updateSellerMoney("totalPrice", v)} />
                  </div>

                  {form.areaMeters && (
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-4 text-sm text-emerald-800">
                      {form.pricePerMeter
                        ? `قیمت کل محاسبه‌شده: ${formatMoney(calculatedTotalPrice)} تومان`
                        : form.totalPrice
                          ? `قیمت هر متر محاسبه‌شده: ${formatMoney(calculatedPricePerMeter)} تومان`
                          : "قیمت هر متر یا قیمت کل را وارد کنید تا مقدار دیگر محاسبه شود."}
                    </div>
                  )}

                  <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <input type="checkbox" checked={form.exchange} onChange={e => setField("exchange", e.target.checked)} className="h-5 w-5 accent-emerald-600" />
                    <span className="text-sm font-semibold text-slate-700">آیا مایل به معاوضه هستید؟</span>
                  </label>

                  {form.exchange && (
                    <div className="mt-4">
                      <Field fieldKey="exchangeWith" error={errors.exchangeWith} label="معاوضه با چی؟" value={form.exchangeWith} onChange={v => setField("exchangeWith", v)} placeholder="مثلاً آپارتمان، خودرو، زمین و..." />
                    </div>
                  )}
                </section>
              )}

              {(activeType === "landlord" || activeType === "tenant") && (
                <section className="rounded-2xl bg-slate-50 p-5">
                  <h2 className="mb-5 text-lg font-extrabold text-slate-900">مبلغ رهن و اجاره</h2>
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <MoneyInput fieldKey="rent" error={errors.rent} label="رهن" value={form.deposit} onChange={v => setField("deposit", v)} />
                    <MoneyInput fieldKey="rent" error={errors.rent} label="اجاره ماهانه" value={form.rent} onChange={v => setField("rent", v)} />
                  </div>
                </section>
              )}

              {activeType === "buyer" && (
                <section className="rounded-2xl bg-emerald-50 p-5">
                  <h2 className="mb-5 text-lg font-extrabold text-slate-900">بودجه خرید</h2>
                  <MoneyInput fieldKey="totalPrice" error={errors.totalPrice} label="بودجه خرید" value={form.totalPrice} onChange={v => setField("totalPrice", rawMoney(v))} />
                </section>
              )}

              <section data-field="description">
                <label className="mb-2 block text-sm font-semibold text-slate-700">توضیحات</label>
                <textarea
                  value={form.description}
                  onChange={e => setField("description", e.target.value)}
                  rows={4}
                  placeholder="توضیحات تکمیلی درخواست..."
                  className={`w-full resize-none rounded-xl border ${errors.description ? "border-red-400" : "border-slate-300"} bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100`}
                />
                <ErrorText message={errors.description} />
              </section>

              {Object.keys(errors).length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  بعضی اطلاعات معتبر نیست. موارد قرمز را اصلاح کنید.
                </div>
              )}

              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {saveError}
                </div>
              )}

              {submitted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  درخواست با موفقیت در پایگاه داده آنلاین ذخیره شد.
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "در حال ذخیره..." : "ثبت درخواست"}
                </button>
                <button type="button" onClick={closeForm} className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold">
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </main>
      )}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span>© ۱۴۰۵ ملک‌نت — شبکه هوشمند املاک</span>
          <span>خرید • فروش • اجاره • موجری</span>
        </div>
      </footer>
    </div>
  );
}


function compatibleType(a, b) {
  const pairs = new Set([
    "buyer:seller", "seller:buyer",
    "tenant:landlord", "landlord:tenant",
  ]);
  return pairs.has(`${a}:${b}`);
}

function moneyNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function similarityScore(target, item) {
  let score = 0;
  let weight = 0;

  const add = (condition, w) => {
    weight += w;
    if (condition) score += w;
  };

  add(target.request_type_id === item.request_type_id, 8);
  add(target.city && item.city && target.city.trim() === item.city.trim(), 16);
  add(target.area && item.area && target.area.trim() === item.area.trim(), 12);
  add(target.neighborhood && item.neighborhood && target.neighborhood.trim() === item.neighborhood.trim(), 10);
  add(target.property_type && item.property_type && target.property_type === item.property_type, 10);

  const areaA = moneyNumber(target.area_size);
  const areaB = moneyNumber(item.area_size);
  if (areaA > 0 && areaB > 0) {
    const ratio = Math.abs(areaA - areaB) / Math.max(areaA, areaB);
    add(ratio <= 0.05, 8);
    if (ratio > 0.05 && ratio <= 0.15) score += 5;
    weight += 8;
  }

  const bedA = target.bedrooms;
  const bedB = item.bedrooms;
  if (bedA != null && bedB != null) {
    add(Number(bedA) === Number(bedB), 6);
    if (Math.abs(Number(bedA) - Number(bedB)) === 1) score += 3;
  }

  add(target.direction && item.direction && target.direction === item.direction, 4);
  add(typeof target.parking === "boolean" && typeof item.parking === "boolean" && target.parking === item.parking, 4);
  add(typeof target.storage === "boolean" && typeof item.storage === "boolean" && target.storage === item.storage, 3);
  add(typeof target.elevator === "boolean" && typeof item.elevator === "boolean" && target.elevator === item.elevator, 3);

  const targetPrice = moneyNumber(target.total_price || target.budget);
  const itemPrice = moneyNumber(item.total_price || item.budget);
  if (targetPrice > 0 && itemPrice > 0) {
    const ratio = Math.abs(targetPrice - itemPrice) / Math.max(targetPrice, itemPrice);
    add(ratio <= 0.10, 8);
    if (ratio > 0.10 && ratio <= 0.25) score += 4;
    weight += 8;
  }

  const targetRent = moneyNumber(target.rent);
  const itemRent = moneyNumber(item.rent);
  if (targetRent > 0 && itemRent > 0) {
    const ratio = Math.abs(targetRent - itemRent) / Math.max(targetRent, itemRent);
    add(ratio <= 0.10, 6);
    if (ratio > 0.10 && ratio <= 0.25) score += 3;
    weight += 6;
  }

  const targetDeposit = moneyNumber(target.deposit);
  const itemDeposit = moneyNumber(item.deposit);
  if (targetDeposit > 0 && itemDeposit > 0) {
    const ratio = Math.abs(targetDeposit - itemDeposit) / Math.max(targetDeposit, itemDeposit);
    add(ratio <= 0.15, 5);
    if (ratio > 0.15 && ratio <= 0.30) score += 2;
    weight += 5;
  }

  if (compatibleType(target.request_type_id, item.request_type_id)) {
    score += 12;
    weight += 12;
  }

  return Math.max(0, Math.min(100, Math.round((score / Math.max(weight, 1)) * 100)));
}

function toPersianNumber(value) {
  return String(value ?? "").replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

function formatDashboardMoney(value) {
  return value ? Number(value).toLocaleString("en-US") + " تومان" : "—";
}

function requestTypeTitle(key) {
  return requestTypes.find(x => x.key === key)?.title || key || "—";
}

function exportRequestsToExcel(rows) {
  const headers = [
    ["شماره درخواست","نوع","وضعیت","نام","موبایل","شهر","منطقه","محله","آدرس","نوع ملک","متراژ","خواب","طبقه","طبقات","تعداد واحد","جهت","پارکینگ","انباری","آسانسور","قیمت هر متر","قیمت کل","رهن","اجاره","معاوضه","معاوضه با","توضیحات","تاریخ ثبت"]
  ];

  const body = rows.map(r => [
    r.request_number,
    requestTypeTitle(r.request_type_id),
    r.status,
    r.name,
    r.phone,
    r.city,
    r.area,
    r.neighborhood,
    r.address,
    r.property_type,
    r.area_size,
    r.bedrooms,
    r.floor,
    r.total_floors,
    r.building_units,
    r.direction,
    r.parking === true ? "دارد" : r.parking === false ? "ندارد" : "",
    r.storage === true ? "دارد" : r.storage === false ? "ندارد" : "",
    r.elevator === true ? "دارد" : r.elevator === false ? "ندارد" : "",
    r.price_per_meter,
    r.total_price || r.budget,
    r.deposit,
    r.rent,
    r.exchange ? "دارد" : "ندارد",
    r.exchange_with,
    r.description,
    r.created_at ? new Date(r.created_at).toLocaleString("fa-IR") : "",
  ]);

  const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const table = [...headers, ...body]
    .map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`)
    .join("");

  const html = `<!doctype html><html dir="rtl"><head><meta charset="UTF-8"><style>
  table{border-collapse:collapse;font-family:Tahoma,Arial;font-size:12px}
  td{border:1px solid #999;padding:6px;white-space:nowrap}
  tr:first-child{font-weight:bold;background:#eee}
  </style></head><body><table>${table}</table></body></html>`;

  const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `melknet-requests-${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ConsultantLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (loginError) {
      setError("ایمیل یا رمز عبور صحیح نیست.");
      return;
    }

    onLogin(data.user);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-lg">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white">🏠</div>
          <h1 className="text-2xl font-black text-slate-900">ورود مشاور</h1>
          <p className="mt-2 text-sm text-slate-500">مدیریت درخواست‌های ملک‌نت</p>
        </div>

        <div className="space-y-4">
          <Field label="ایمیل" value={email} onChange={setEmail} type="email" placeholder="consultant@example.com" />
          <Field label="رمز عبور" value={password} onChange={setPassword} type="password" />
        </div>

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

        <button disabled={loading} className="mt-6 w-full rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white disabled:opacity-60">
          {loading ? "در حال ورود..." : "ورود به پنل"}
        </button>

        <button type="button" onClick={() => { window.location.href = "/"; }} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold">
          بازگشت به صفحه مشتری
        </button>
      </form>
    </div>
  );
}

function ConsultantPortal() {
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(`دریافت درخواست‌ها انجام نشد: ${fetchError.message}`);
      setRequests([]);
    } else {
      setRequests(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user || null);
      setSessionReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user || null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) loadRequests();
  }, [user]);

  useEffect(() => {
    if (!selected) {
      setSuggestions([]);
      return;
    }

    const ranked = requests
      .filter(r => r.id !== selected.id)
      .map(r => ({ ...r, match: similarityScore(selected, r) }))
      .filter(r => r.match >= 35)
      .sort((a, b) => b.match - a.match)
      .slice(0, 10);

    setSuggestions(ranked);
  }, [selected, requests]);

  const filtered = requests.filter(r => {
    const q = filter.trim().toLowerCase();
    const textMatch = !q || [
      r.name, r.phone, r.city, r.area, r.neighborhood, r.address, r.property_type,
    ].some(v => String(v ?? "").toLowerCase().includes(q));

    return textMatch &&
      (!typeFilter || r.request_type_id === typeFilter) &&
      (!statusFilter || r.status === statusFilter);
  });

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSelected(null);
  };

  if (!sessionReady) {
    return <div dir="rtl" className="min-h-screen flex items-center justify-center">در حال بررسی ورود...</div>;
  }

  if (!user) return <ConsultantLogin onLogin={setUser} />;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div>
            <div className="text-xl font-black text-slate-900">ملک‌نت | پنل مشاور</div>
            <div className="text-xs text-slate-500">{user.email}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadRequests} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">↻ بروزرسانی</button>
            <button onClick={() => exportRequestsToExcel(filtered)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">📊 خروجی اکسل</button>
            <button onClick={logout} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600">خروج</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            ["کل درخواست‌ها", requests.length],
            ["خریدار", requests.filter(r => r.request_type_id === "buyer").length],
            ["فروشنده", requests.filter(r => r.request_type_id === "seller").length],
            ["اجاره", requests.filter(r => r.request_type_id === "tenant" || r.request_type_id === "landlord").length],
          ].map(([title, count]) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">{title}</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{toPersianNumber(count)}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="جستجو نام، شهر، محله، تلفن..." className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                  <option value="">همه درخواست‌ها</option>
                  {requestTypes.map(t => <option key={t.key} value={t.key}>{t.title}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm">
                  <option value="">همه وضعیت‌ها</option>
                  <option value="جدید">جدید</option>
                  <option value="پیگیری">پیگیری</option>
                  <option value="انجام شد">انجام شد</option>
                </select>
              </div>
            </div>

            <div className="overflow-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-500">در حال دریافت درخواست‌ها...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-500">درخواستی پیدا نشد.</div>
              ) : (
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3 text-right">درخواست</th>
                      <th className="p-3 text-right">نوع</th>
                      <th className="p-3 text-right">نام</th>
                      <th className="p-3 text-right">مکان</th>
                      <th className="p-3 text-right">متراژ</th>
                      <th className="p-3 text-right">قیمت / رهن</th>
                      <th className="p-3 text-right">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} onClick={() => setSelected(r)} className={`cursor-pointer border-t border-slate-100 hover:bg-emerald-50 ${selected?.id === r.id ? "bg-emerald-50" : ""}`}>
                        <td className="p-3 font-bold">{toPersianNumber(r.request_number)}</td>
                        <td className="p-3">{requestTypeTitle(r.request_type_id)}</td>
                        <td className="p-3">{r.name}</td>
                        <td className="p-3">{r.city} / {r.area}</td>
                        <td className="p-3">{r.area_size ? toPersianNumber(r.area_size) + " متر" : "—"}</td>
                        <td className="p-3">{formatDashboardMoney(r.total_price || r.budget || r.deposit || r.rent)}</td>
                        <td className="p-3">{r.created_at ? new Date(r.created_at).toLocaleDateString("fa-IR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {error && <div className="m-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selected ? (
              <div className="flex min-h-[420px] items-center justify-center text-center text-slate-500">
                <div>
                  <div className="text-5xl">🤖</div>
                  <h2 className="mt-4 font-black text-slate-900">پیشنهاد هوشمند</h2>
                  <p className="mt-2 text-sm leading-6">یک درخواست را انتخاب کنید تا نزدیک‌ترین درخواست‌های قبلی بر اساس شهر، منطقه، نوع ملک، متراژ، قیمت، امکانات و نوع درخواست نمایش داده شوند.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 pb-4">
                  <div className="text-xs text-slate-500">درخواست انتخاب‌شده</div>
                  <h2 className="mt-1 text-lg font-black">{selected.name}</h2>
                  <div className="mt-2 text-sm text-slate-600">{requestTypeTitle(selected.request_type_id)} • {selected.city} • {selected.area}</div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <h3 className="font-black">نزدیک‌ترین پیشنهادها</h3>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{suggestions.length} مورد</span>
                </div>

                <div className="mt-3 space-y-3">
                  {suggestions.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">مورد مشابه کافی پیدا نشد.</div>
                  ) : suggestions.map(r => (
                    <button key={r.id} onClick={() => setSelected(r)} className="w-full rounded-xl border border-slate-200 p-3 text-right hover:border-emerald-300 hover:bg-emerald-50">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold">{r.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{requestTypeTitle(r.request_type_id)} • {r.city} • {r.area}</div>
                        </div>
                        <div className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">{toPersianNumber(r.match)}٪</div>
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        {r.property_type || "ملک"} • {r.area_size ? toPersianNumber(r.area_size) + " متر" : "متراژ نامشخص"} • {formatDashboardMoney(r.total_price || r.budget || r.deposit || r.rent)}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname;
  if (
    path === "/moshaver" ||
    path.startsWith("/moshaver/") ||
    path === "/consultant" ||
    path.startsWith("/consultant/")
  ) return <ConsultantPortal />;
  return <CustomerApp />;
}
