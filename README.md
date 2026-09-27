# Bio Exam App

وب‌اپ آزمون‌ساز زیست‌شناسی با React، Vite و Supabase.

## اجرای محلی

1. وابستگی‌ها را نصب کنید:

   ```bash
   npm install
   ```

2. فایل `.env.example` را به `.env` کپی کنید و مقادیر پروژه Supabase را وارد کنید.
3. migrationهای پوشه `supabase/migrations` را به ترتیب زمانی روی پروژه Supabase اجرا کنید.
4. برنامه را اجرا کنید:

   ```bash
   npm run dev
   ```

## بررسی قبل از انتشار

```bash
npm run typecheck
npm run lint
npm run build
```

## انتشار روی Vercel

1. مخزن GitHub را به Vercel متصل کنید.
2. Framework را روی Vite یا حالت تشخیص خودکار بگذارید.
3. متغیرهای `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` را در تنظیمات پروژه Vercel اضافه کنید.
4. هر دو متغیر را برای محیط‌های Production، Preview و Development تنظیم کنید.
5. پس از اولین انتشار، آدرس دامنه را در Supabase در بخش Authentication → URL Configuration به‌عنوان `Site URL` و `Redirect URL` مجاز اضافه کنید.

## Supabase

پروژه به Supabase متصل است و schema/migrationهای لازم در `supabase/migrations` قرار دارند. کلید `anon` برای فرانت‌اند قابل استفاده است، اما فایل `.env` نباید در GitHub commit شود. هرگز `service_role` key را در کد فرانت‌اند یا متغیرهای `VITE_*` قرار ندهید.

قبل از عمومی‌کردن برنامه، policyهای RLS migration اولیه بازبینی شوند؛ این migration در حال حاضر بسیاری از عملیات جداول اصلی را برای `anon` باز می‌کند و برای داده‌های واقعی مناسب نیست.
