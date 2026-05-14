CREATE OR REPLACE FUNCTION public.get_photographer_busy_ranges(
  _photographer_id uuid,
  _from_date date,
  _to_date date
)
RETURNS TABLE(busy_date date, start_time time, end_time time)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.booked_date,
         a.start_time,
         COALESCE(
           a.end_time,
           (a.start_time + make_interval(mins => COALESCE(s.duration_minutes, 60)))::time
         )
  FROM public.bookings b
  JOIN public.session_availability a ON a.id = b.availability_id
  LEFT JOIN public.sessions s ON s.id = a.session_id
  WHERE b.photographer_id = _photographer_id
    AND b.status IN ('confirmed','pending')
    AND b.booked_date BETWEEN _from_date AND _to_date
  UNION ALL
  SELECT cp.shoot_date,
         cp.shoot_time::time,
         (cp.shoot_time::time + make_interval(mins => COALESCE(s2.duration_minutes, 60)))::time
  FROM public.client_projects cp
  LEFT JOIN public.sessions s2
    ON s2.photographer_id = cp.photographer_id AND s2.title = cp.session_type
  WHERE cp.photographer_id = _photographer_id
    AND cp.shoot_date BETWEEN _from_date AND _to_date
    AND cp.shoot_time IS NOT NULL
    AND cp.shoot_time <> ''
    AND cp.stage <> 'archived';
$$;

GRANT EXECUTE ON FUNCTION public.get_photographer_busy_ranges(uuid, date, date) TO anon, authenticated;