-- Update the user creation trigger to also extract phone_kr from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone_kr, name)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'phone_kr',
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
