
-- Enum for subscription plans
CREATE TYPE public.subscription_status AS ENUM ('active', 'canceled', 'expired', 'trial');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Subscription plans
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_channels INT NOT NULL DEFAULT 1,
  max_sources INT NOT NULL DEFAULT 5,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON public.subscription_plans FOR SELECT USING (true);

-- Insert default plans
INSERT INTO public.subscription_plans (name, slug, price_monthly, price_yearly, max_channels, max_sources, sort_order, features) VALUES
  ('Старт', 'start', 990, 9900, 1, 5, 1, '["1 канал", "5 источников", "50 постов/день", "Базовая ИИ-переработка"]'::jsonb),
  ('Про', 'pro', 2490, 24900, 5, 25, 2, '["5 каналов", "25 источников", "Безлимит постов", "Продвинутый ИИ", "Аналитика"]'::jsonb),
  ('Бизнес', 'business', 6990, 69900, 999, 999, 3, '["Безлимит каналов", "Безлимит источников", "Безлимит постов", "GPT-5 ИИ", "API доступ", "Приоритетная поддержка"]'::jsonb);

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  subscription_plan_id UUID REFERENCES public.subscription_plans(id),
  subscription_status public.subscription_status DEFAULT 'trial',
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS for user_roles
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  gateway TEXT NOT NULL,
  gateway_payment_id TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own payments" ON public.payments FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts payments" ON public.payments FOR INSERT WITH CHECK (true);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
