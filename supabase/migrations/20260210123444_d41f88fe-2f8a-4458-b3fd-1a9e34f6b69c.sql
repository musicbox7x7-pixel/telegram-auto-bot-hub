
-- Fix: restrict payment inserts to authenticated or service role context only
DROP POLICY "System inserts payments" ON public.payments;
CREATE POLICY "Authenticated users can insert own payments" ON public.payments 
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can insert payments" ON public.payments 
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
