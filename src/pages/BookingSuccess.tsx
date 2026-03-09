import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const BookingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("store");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
      <CheckCircle className="h-12 w-12 text-primary" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-light tracking-wide">Booking Confirmed!</h1>
        <p className="text-sm font-light text-muted-foreground max-w-sm">
          Your session has been booked and payment processed. You'll receive a confirmation email shortly.
        </p>
      </div>
      {slug && (
        <Button
          variant="outline"
          onClick={() => navigate(`/store/${slug}`)}
          className="text-xs tracking-wider uppercase font-light"
        >
          ← Back to Store
        </Button>
      )}
    </div>
  );
};

export default BookingSuccess;
