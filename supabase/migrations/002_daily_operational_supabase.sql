BEGIN;

-- 1. Drop the old Phase 3 Table and Function
DROP FUNCTION IF EXISTS public.submit_bill_update(uuid, uuid, text, text, numeric);
DROP TABLE IF EXISTS public.bill_updates CASCADE;

-- 2. Create the exact Phase 4 Table (matches your Python backend)
CREATE TABLE IF NOT EXISTS public.operator_updates (
  update_id uuid PRIMARY KEY,
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.daily_batches(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES public.profiles(id),
  route_id uuid REFERENCES public.routes(id),
  cash_amount numeric DEFAULT 0,
  online_amount numeric DEFAULT 0,
  cheq_amount numeric DEFAULT 0,
  cash_pending_amount numeric DEFAULT 0,
  is_cancelled boolean DEFAULT false,
  cancel_remark text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS and Add Policies for the new table
ALTER TABLE public.operator_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select all updates" ON public.operator_updates FOR SELECT USING (public.is_admin());
CREATE POLICY "Operators can select own updates" ON public.operator_updates FOR SELECT USING (public.is_active_user() AND operator_id = auth.uid());
CREATE POLICY "Prevent direct insert update use RPC" ON public.operator_updates FOR INSERT WITH CHECK (false);
CREATE POLICY "Prevent direct update use RPC" ON public.operator_updates FOR UPDATE USING (false) WITH CHECK (false);

-- 4. Create the new Phase 4 RPC Function
CREATE OR REPLACE FUNCTION public.submit_bill_update_v4(
  p_update_id uuid,
  p_bill_id uuid,
  p_cash_amount numeric,
  p_online_amount numeric,
  p_cheq_amount numeric,
  p_cash_pending_amount numeric,
  p_is_cancelled boolean,
  p_cancel_remark text,
  p_notes text,
  p_created_at timestamptz
)
RETURNS uuid AS $$
DECLARE
  v_operator_id uuid;
  v_bill_id uuid;
  v_batch_id uuid;
  v_route_id uuid;
  v_new_status text;
  v_total_collected numeric;
BEGIN
  -- Verify active user
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'User is not active'; END IF;
  v_operator_id := auth.uid();

  -- Get bill details
  SELECT id, batch_id, route_id INTO v_bill_id, v_batch_id, v_route_id
  FROM public.bills WHERE id = p_bill_id AND active = true;

  IF v_bill_id IS NULL THEN RAISE EXCEPTION 'Bill not found'; END IF;

  -- Verify operator is assigned to this bill
  IF NOT EXISTS (SELECT 1 FROM public.bills WHERE id = p_bill_id AND assigned_operator_id = v_operator_id AND active = true) THEN
    RAISE EXCEPTION 'Not authorized to update this bill';
  END IF;

  -- Calculate totals and status
  v_total_collected := COALESCE(p_cash_amount, 0) + COALESCE(p_online_amount, 0) + COALESCE(p_cheq_amount, 0);
  
  IF p_is_cancelled THEN
    v_new_status := 'cancelled';
  ELSIF COALESCE(p_cash_pending_amount, 0) > 0 THEN
    v_new_status := 'collected_partial';
  ELSE
    v_new_status := 'collected_full';
  END IF;

  -- Insert update idempotently
  INSERT INTO public.operator_updates (
    update_id, bill_id, batch_id, operator_id, route_id,
    cash_amount, online_amount, cheq_amount, cash_pending_amount,
    is_cancelled, cancel_remark, notes, created_at
  ) VALUES (
    p_update_id, p_bill_id, v_batch_id, v_operator_id, v_route_id,
    COALESCE(p_cash_amount, 0), COALESCE(p_online_amount, 0), COALESCE(p_cheq_amount, 0), COALESCE(p_cash_pending_amount, 0),
    COALESCE(p_is_cancelled, false), p_cancel_remark, p_notes, COALESCE(p_created_at, now())
  ) ON CONFLICT (update_id) DO NOTHING;

  -- Update latest bill status in bills table
  UPDATE public.bills
  SET
    latest_remark = CASE WHEN p_is_cancelled THEN p_cancel_remark ELSE 'Payment Collected' END,
    latest_note = p_notes,
    latest_updated_amount = v_total_collected,
    latest_update_at = now(),
    status = v_new_status
  WHERE id = p_bill_id;

  RETURN p_update_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_bill_update_v4 TO authenticated;

COMMIT;