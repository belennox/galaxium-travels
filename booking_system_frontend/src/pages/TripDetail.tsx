import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plane,
  Copy,
  CheckCircle,
  XCircle,
  Crown,
  Rocket,
  Calendar,
  Clock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { getBooking, getFlights, cancelBooking, isErrorResponse } from '../services/api';
import { useUser } from '../hooks/useUser';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Button } from '../components/common/Button';
import { formatDate, formatCurrency } from '../utils/formatters';
import type { Booking, Flight } from '../types';

// Animated section wrapper — staggered entrance matching site-wide style
const Section = ({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={className}
  >
    {children}
  </motion.div>
);

export const TripDetail = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useUser();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/flights');
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const id = Number(bookingId);
        if (isNaN(id)) {
          setNotFound(true);
          return;
        }

        const result = await getBooking(id);

        if (isErrorResponse(result)) {
          setNotFound(true);
          return;
        }

        if (result.user_id !== user.user_id) {
          setAccessDenied(true);
          return;
        }

        setBooking(result);

        // Resolve flight details
        const flights = await getFlights();
        const match = flights.find((f) => f.flight_id === result.flight_id) ?? null;
        setFlight(match);
      } catch {
        toast.error('Failed to load booking');
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [bookingId, user, navigate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`#${booking!.booking_id}`);
    setCopied(true);
    toast.success('Booking reference copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const result = await cancelBooking(booking.booking_id);
      if (isErrorResponse(result)) {
        toast.error(result.error);
        return;
      }
      setBooking(result);
      toast.success('Booking cancelled');
    } catch {
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const getSeatClassIcon = (seatClass: Booking['seat_class']) => {
    switch (seatClass) {
      case 'business':
        return <Crown className="text-purple-400" size={16} />;
      case 'galaxium':
        return <Rocket className="text-alien-green" size={16} />;
      default:
        return <Plane className="text-blue-400" size={16} />;
    }
  };

  const getSeatClassName = (seatClass: Booking['seat_class']) => {
    switch (seatClass) {
      case 'business':
        return 'Business';
      case 'galaxium':
        return 'Galaxium Class';
      default:
        return 'Economy';
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center py-32">
        <LoadingSpinner text="Loading your trip…" />
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md"
        >
          <XCircle size={48} className="mx-auto mb-6 text-red-500" />
          <h1 className="text-3xl font-bold text-star-white mb-4">Booking not found</h1>
          <p className="text-star-white/70 mb-8">
            We couldn't find booking <span className="font-mono text-cosmic-purple">#{bookingId}</span>.
          </p>
          <Link to="/bookings">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cosmic-gradient text-white font-semibold hover:opacity-90 transition-opacity">
              <ArrowLeft size={18} />
              My Bookings
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Access denied ─────────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md"
        >
          <XCircle size={48} className="mx-auto mb-6 text-solar-orange" />
          <h1 className="text-3xl font-bold text-star-white mb-4">Access denied</h1>
          <p className="text-star-white/70 mb-8">
            This booking doesn't belong to your account.
          </p>
          <Link to="/bookings">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cosmic-gradient text-white font-semibold hover:opacity-90 transition-opacity">
              <ArrowLeft size={18} />
              My Bookings
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!booking) return null;

  const pageUrl = window.location.href;
  const canCancel = booking.status === 'booked';

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Back link */}
      <Section delay={0}>
        <Link
          to="/bookings"
          className="inline-flex items-center gap-2 text-star-white/60 hover:text-star-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          My Bookings
        </Link>
      </Section>

      {/* ── Hero: reference + status ───────────────────────────────────────── */}
      <Section delay={0.05}>
        <div className="glass-card p-8 border border-cosmic-purple/30 bg-cosmic-purple/5">
          <p className="text-xs text-star-white/50 uppercase tracking-widest mb-2">Booking Reference</p>
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-star-white">#{booking.booking_id}</h1>
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Copy booking reference"
            >
              {copied ? (
                <CheckCircle size={18} className="text-alien-green" />
              ) : (
                <Copy size={18} className="text-star-white/60" />
              )}
            </button>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              booking.status === 'booked'
                ? 'bg-alien-green/10 text-alien-green border border-alien-green/30'
                : booking.status === 'cancelled'
                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
            }`}
          >
            {booking.status === 'booked' ? (
              <CheckCircle size={12} />
            ) : (
              <XCircle size={12} />
            )}
            {booking.status}
          </span>
        </div>
      </Section>

      {/* ── QR code ───────────────────────────────────────────────────────── */}
      <Section delay={0.1}>
        <div className="glass-card p-6 flex flex-col items-center gap-4">
          <p className="text-sm text-star-white/60 uppercase tracking-widest">Scan at boarding</p>
          <div className="p-4 bg-white rounded-xl">
            <QRCodeSVG value={pageUrl} size={160} />
          </div>
          <p className="text-xs text-star-white/40 text-center">Encodes this page URL</p>
        </div>
      </Section>

      {/* ── Itinerary ─────────────────────────────────────────────────────── */}
      <Section delay={0.15}>
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-star-white mb-2">Itinerary</h2>
          {flight ? (
            <>
              <p className="text-2xl font-bold text-star-white">
                {flight.origin} → {flight.destination}
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-star-white/50 mb-1 flex items-center gap-1">
                    <Plane size={12} /> Departure
                  </p>
                  <p className="text-sm text-star-white font-medium">{formatDate(flight.departure_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-star-white/50 mb-1 flex items-center gap-1">
                    <Clock size={12} /> Arrival
                  </p>
                  <p className="text-sm text-star-white font-medium">{formatDate(flight.arrival_time)}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-star-white/60">Flight #{booking.flight_id}</p>
          )}
        </div>
      </Section>

      {/* ── Passenger & seat ──────────────────────────────────────────────── */}
      <Section delay={0.2}>
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-star-white mb-2">Passenger & Seat</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-star-white/60">Seat class</span>
            <div className="flex items-center gap-2">
              {getSeatClassIcon(booking.seat_class)}
              <span className="text-sm font-semibold text-star-white">
                {getSeatClassName(booking.seat_class)}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-star-white/60 flex items-center gap-1">
              <Calendar size={14} /> Booked on
            </span>
            <span className="text-sm text-star-white">{formatDate(booking.booking_time)}</span>
          </div>
        </div>
      </Section>

      {/* ── Price & refund ────────────────────────────────────────────────── */}
      <Section delay={0.25}>
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-lg font-bold text-star-white mb-2">Price & Refund</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm text-star-white/60">Price paid</span>
            <span className="text-xl font-bold text-star-white">{formatCurrency(booking.price_paid)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-star-white/60">Refund eligible</span>
            <span className={`text-sm font-semibold ${canCancel ? 'text-alien-green' : 'text-red-400'}`}>
              {canCancel ? 'Yes — cancel to refund' : 'No'}
            </span>
          </div>
        </div>
      </Section>

      {/* ── Cancel action ─────────────────────────────────────────────────── */}
      {canCancel && (
        <Section delay={0.3}>
          <Button
            variant="danger"
            onClick={handleCancel}
            isLoading={isCancelling}
            className="w-full"
          >
            Cancel Booking
          </Button>
        </Section>
      )}
    </div>
  );
};

// Made with Bob
