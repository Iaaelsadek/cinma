-- 1. تحديث جدول profiles لترقية المستخدم إلى admin
-- نفترض أن البريد الإلكتروني موجود في جدول auth.users، ولكن هنا سنقوم بتحديث الدور في جدول profiles
-- بناءً على الربط بين auth.users و public.profiles

-- أولاً: السماح بقيمة 'admin' في عمود role (إذا كان هناك قيد CHECK)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'supervisor'));

-- ثانياً: تحديث الدور للمستخدم المحدد
-- ملاحظة: لا يمكننا الوصول لجدول auth.users مباشرة في استعلام بسيط أحياناً بسبب الصلاحيات، 
-- ولكن يمكننا استخدام معرف المستخدم إذا كنا نعرفه، أو الاعتماد على أن الـ profiles مربوطة بـ auth.users
-- سنقوم بتحديث الـ profile المرتبط بالمستخدم cairo.tv@gmail.com

UPDATE profiles
SET role = 'admin'
FROM auth.users
WHERE profiles.id = auth.users.id
AND auth.users.email = 'cairo.tv@gmail.com';

-- تأكيد التحديث (اختياري، للعرض فقط)
-- SELECT * FROM profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'cairo.tv@gmail.com');
