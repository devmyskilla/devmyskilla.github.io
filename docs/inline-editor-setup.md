# إعداد المحرر المباشر

المحرر المباشر يعمل فوق `data.json` ولا يغيّر بنية المحتوى الأساسية. الزائر العادي لا يدخل وضع التحرير؛ التفعيل يتم فقط عند فتح الموقع مع `?edit=1` ثم تسجيل الدخول عبر GitHub.

## المكونات

- الواجهة العامة: `https://devmyskilla.github.io/?edit=1`
- Worker المتوقع: `https://dunya-inline-editor.atomy8774.workers.dev`
- OAuth callback: `https://dunya-inline-editor.atomy8774.workers.dev/inline/callback`
- المستودع: `devmyskilla/devmyskilla.github.io`
- الفرع الذي يكتب إليه Worker: `main`
- تخزين الجلسات: Cloudflare Workers KV عبر binding باسم `INLINE_SESSIONS`

## 1. GitHub OAuth App

أنشئ GitHub OAuth App منفصلًا للمحرر المباشر، واجعل Authorization callback URL مساويًا تمامًا لـ:

`https://dunya-inline-editor.atomy8774.workers.dev/inline/callback`

احتفظ بـ Client ID وClient Secret خارج GitHub. لا تضع أي قيمة سرية داخل `wrangler.toml` أو ملفات الموقع.

## 2. إعداد Cloudflare Worker

ملف الإعداد هو `inline-worker/wrangler.toml`. يحتوي المتغيرات العامة التالية:

- `ALLOWED_ORIGIN=https://devmyskilla.github.io`
- `GITHUB_REPO=devmyskilla/devmyskilla.github.io`
- `GITHUB_BRANCH=main`
- `SESSION_TTL_SECONDS=3600`
- KV binding: `INLINE_SESSIONS`

Wrangler الحديث يستطيع provision مورد KV تلقائيًا عند أول deploy لأن `INLINE_SESSIONS` معرّف بدون namespace ID. استخدم Wrangler 4.45 أو أحدث.

من مجلد `inline-worker` سجّل دخول Cloudflare ثم خزّن بيانات OAuth كأسرار:

```bash
npx wrangler secret put GITHUB_OAUTH_ID
npx wrangler secret put GITHUB_OAUTH_SECRET
npx wrangler deploy
```

لا تُدخل قيم الأسرار في الأوامر نفسها؛ Wrangler سيطلبها تفاعليًا.

## 3. التحقق بعد النشر

افتح `https://devmyskilla.github.io/?edit=1`. عند عدم وجود جلسة سيعرض المحرر زر تسجيل الدخول. بعد نجاح GitHub OAuth يجب أن تظهر أدوات التحرير فقط للحقول المسموح بها. المتصفح يحتفظ بمعرّف جلسة opaque فقط؛ GitHub access token يبقى داخل Worker/KV ولا يُرسل إلى الواجهة.

الحفظ يقرأ أحدث `data.json` من `main` ويقارن `baseSha`. إذا تغيّر الملف منذ بدء التعديل، يرجع Worker تعارض HTTP 409 بدل الكتابة فوق تعديل أحدث. بعد نجاح الحفظ يكتب Worker `data.json` فقط.

## 4. لوحة Decap

`/admin/` تبقى لوحة Decap CMS الكاملة، وبداخلها رابط **تحرير مباشر** يعيد إلى الصفحة الرئيسية مع `?edit=1`. النظامان يحرران المصدر نفسه `data.json`؛ لذلك حماية SHA في المحرر المباشر تمنع الكتابة الصامتة فوق تغييرات أحدث من Decap.

## أسرار يجب ألا تظهر في المستودع

- `GITHUB_OAUTH_ID`
- `GITHUB_OAUTH_SECRET`
- GitHub access tokens
- معرفات الجلسات الفعلية

يمكن أن تكون بيانات مثل `ALLOWED_ORIGIN` و`GITHUB_REPO` و`GITHUB_BRANCH` علنية لأنها إعدادات وليست أسرارًا.
