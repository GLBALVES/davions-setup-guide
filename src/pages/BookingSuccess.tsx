import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Calendar, Clock, MapPin, Camera } from "lucide-react";

interface BookingDetails {
  client_name: string;
  client_email: string;
  booked_date: string;
  status: string;
  payment_status: string;
}

interface SessionDetails {
  title: string;
  duration_minutes: number;
  location: string | null;
  num_photos: number;
  cover_image_url: string | null;
}

interface AvailabilityDetails {
  start_time: string;
  end_time: string;
}

const BookingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("store");
  const bookingId = searchParams.get("booking");
  const sessionId = searchParams.get("session");

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [availability, setAvailability] = useState<AvailabilityDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId || !sessionId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const [{ data: bookingData }, { data: sessionData }] = await Promise.all([
        supabase
          .from("bookings")
          .select("client_name, client_email, booked_date, status, payment_status, availability_id")
          .eq("id", bookingId)
          .single(),
        supabase
          .from("sessions")
          .select("title, duration_minutes, location, num_photos, cover_image_url")
          .eq("id", sessionId)
          .single(),
      ]);

      if (bookingData) {
        setBooking(bookingData as BookingDetails);

        // Fetch availability slot time
        const availId = (bookingData as { availability_id: string }).availability_id;
        if (availId) {
          const { data: availData } = await supabase
            .from("session_availability")
            .select("start_time, end_time")
            .eq("id", availId)
            .single();
          if (availData) setAvailability(availData as AvailabilityDetails);
        }
      }

      if (sessionData) setSession(sessionData as SessionDetails);
      setLoading(false);
    };

    load();
  }, [bookingId, sessionId]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-xs tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md flex flex-col gap-8">

        {/* Success icon + headline */}
        <div className="flex flex-col items-center text-center gap-4">
          <CheckCircle className="h-12 w-12 text-primary" strokeWidth={1.5} />
          <div>
            <p className="text-[9px] tracking-[0.4em] uppercase text-muted-foreground mb-2">
              Booking confirmed
            </p>
            <h1 className="text-2xl font-light tracking-wide">
              {booking?.client_name ? `See you soon, ${booking.client_name.split(" ")[0]}!` : "You're all set!"}
            </h1>
            <p className="text-sm font-light text-muted-foreground mt-2">
              A confirmation has been sent to{" "}
              <span className="text-foreground">{booking?.client_email}</span>
            </p>
          </div>
        </div>

        {/* Session + booking details */}
        {(session || booking) && (
          <div className="border border-border divide-y divide-border">
            {session?.cover_image_url && (
              <div className="aspect-video overflow-hidden">
                <img
                  src={session.cover_image_url}
                  alt={session.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-5 flex flex-col gap-3">
              {session?.title && (
                <h2 className="text-base font-light tracking-wide">{session.title}</h2>
              )}

              <div className="flex flex-col gap-2 text-[11px] text-muted-foreground">
                {booking?.booked_date && (
                  <span className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {formatDate(booking.booked_date)}
                  </span>
                )}
                {availability?.start_time && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {availability.start_time.slice(0, 5)}
                    {availability.end_time ? ` – ${availability.end_time.slice(0, 5)}` : ""}
                  </span>
                )}
                {session?.duration_minutes && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0 opacity-0" />
                    {session.duration_minutes} minutes
                  </span>
                )}
                {session?.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {session.location}
                  </span>
                )}
                {session?.num_photos && (
                  <span className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 shrink-0" />
                    {session.num_photos} photos delivered
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {slug && (
            <Button
              variant="outline"
              onClick={() => navigate(`/store/${slug}`)}
              className="w-full text-xs tracking-wider uppercase font-light"
            >
              ← Back to Store
            </Button>
          )}
        </div>
      </div>

      <footer className="mt-16">
        <p className="text-[9px] tracking-widest uppercase text-muted-foreground/40">
          Powered by Davions
        </p>
      </footer>
    </div>
  );
};

export default BookingSuccess;
