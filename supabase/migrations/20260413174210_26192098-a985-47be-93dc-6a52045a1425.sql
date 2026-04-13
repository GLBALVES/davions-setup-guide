
CREATE TABLE public.contract_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  field_key text NOT NULL DEFAULT '',
  field_label text NOT NULL DEFAULT '',
  default_value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contract_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own contract_custom_fields"
  ON public.contract_custom_fields FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());
