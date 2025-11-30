BEGIN;
ALTER TABLE public.brands ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE public.brands ALTER COLUMN user_id SET NOT NULL;
DROP INDEX IF EXISTS idx_brands_user_id;
CREATE INDEX idx_brands_user_id ON public.brands(user_id);
COMMIT;
