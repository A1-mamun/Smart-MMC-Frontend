import { Clock, ExternalLink, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The actual coaching center location. The coordinates were resolved
// from the Google Maps short link the admin shared. The "View on
// Google Maps" link below points at the same place so visitors can
// open it in the Google Maps app for turn-by-turn directions.
const LOCATION = {
  name: "Mehedi Math Care (Smart MMC)",
  // Latitude / longitude of the place pin.
  lat: 24.366527,
  lng: 88.6006721,
  // Google Maps place page — what the short link maps.app.goo.gl
  // resolves to. Kept as a regular maps URL (not the short one) so
  // it stays valid even if the short link expires.
  googleMapsUrl:
    "https://www.google.com/maps/place/Mehedi+Math+Care/@24.3665319,88.5980972,870m/data=!3m2!1e3!4b1!4m6!3m5!1s0x39fbef7791effb39:0xbd66a9751ed43db8!8m2!3d24.366527!4d88.6006721!16s%2Fg%2F11n7wcprbp",
};

const CONTACT_DETAILS = [
  {
    icon: MapPin,
    title: "Visit Us",
    lines: [
      LOCATION.name,
      "Boalia, Rajshahi",
      "Bangladesh",
    ],
  },
  {
    icon: Phone,
    title: "Call Us",
    lines: ["+880 1700-000000", "+880 1800-000000"],
  },
  {
    icon: Mail,
    title: "Email Us",
    lines: ["admission@smartmmc.edu", "support@smartmmc.edu"],
  },
  {
    icon: Clock,
    title: "Class Hours",
    lines: ["Sat – Thu: 8:00 AM – 9:00 PM", "Friday: Closed"],
  },
];

const LocationContactSection = () => {
  return (
    <section id="contact" className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <MessageCircle className="h-3.5 w-3.5" />
            Get in Touch
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Visit, Call or Write to Us
          </h2>
          <p className="mt-3 text-muted-foreground">
            Have questions about admissions or batches? Drop us a message and
            our team will respond within 24 hours.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Map — Google Maps embed (no API key required). We use
              the `output=embed` endpoint which renders the standard
              Google Maps interface WITH the red location pin at the
              coordinates. The old OpenStreetMap embed only had a
              small blue dot — the user wanted the iconic red pin
              like Google Maps. */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden">
              <div className="relative h-72 sm:h-96 lg:h-full lg:min-h-[420px]">
                <iframe
                  title="Smart MMC Location"
                  src={`https://maps.google.com/maps?q=${LOCATION.lat},${LOCATION.lng}&z=16&output=embed`}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                {/* Open in Google Maps button — sits on top of the
                    embed so visitors can get turn-by-turn directions
                    on their phone. */}
                <a
                  href={LOCATION.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-900 shadow-md transition hover:bg-slate-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in Google Maps
                </a>
              </div>
            </Card>
          </div>

          {/* Contact form + details */}
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold">Send Us a Message</h3>
                <p className="text-sm text-muted-foreground">
                  For admissions, demo classes or any queries.
                </p>
                <form className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name">Full Name</Label>
                    <Input id="contact-name" placeholder="Your name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email">Email or Phone</Label>
                    <Input id="contact-email" placeholder="you@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-msg">Message</Label>
                    <Textarea
                      id="contact-msg"
                      rows={4}
                      placeholder="Tell us what you're looking for…"
                    />
                  </div>
                  <Button type="button" className="w-full">
                    <Send className="h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {CONTACT_DETAILS.map((item) => (
                <Card key={item.title}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      {item.lines.map((line) => (
                        <p key={line} className="text-xs text-muted-foreground">
                          {line}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LocationContactSection;