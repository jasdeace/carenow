-- Update the trigger to extract phone_kr from metadata on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone_kr)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone_kr'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
