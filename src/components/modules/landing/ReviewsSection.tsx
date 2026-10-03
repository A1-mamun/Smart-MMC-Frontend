import Image from "next/image";
import { Quote, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Review = {
  name: string;
  role: string;
  rating: number;
  quote: string;
  avatar: string;
  highlight?: boolean;
};

const REVIEWS: Review[] = [
  {
    name: "Mahmuda Akter",
    role: "Guardian of Sadia (HSC 2025)",
    rating: 5,
    quote:
      "The NFC attendance system gave me peace of mind. I always know when Sadia reached class — and the SMS updates after every exam are a blessing.",
    avatar:
      "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80",
    highlight: true,
  },
  {
    name: "Rakib Hasan",
    role: "Student · HSC 2nd Year",
    rating: 5,
    quote:
      "Mehedi vai explains every concept like a story. I went from a B student to confidently scoring A in my pre-tests.",
    avatar:
      "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Nazrul Haque",
    role: "Guardian of Tanvir (HSC 2024)",
    rating: 5,
    quote:
      "Transparent payment ledger and clean communication. As a parent living abroad, Smart MMC keeps me connected to my son’s progress.",
    avatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Ayesha Siddika",
    role: "Student · HSC Final Prep",
    rating: 5,
    quote:
      "Doubt sessions are intimate and personal. The mentor actually sits with us until we get every problem. That’s rare.",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Farzana Yeasmin",
    role: "Guardian of Anika (HSC 2025 Topper)",
    rating: 5,
    quote:
      "Smart MMC didn’t just prepare my daughter for the exam — it prepared her for the next chapter of life. Forever grateful.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80",
  },
  {
    name: "Sabbir Ahmed",
    role: "Student · HSC 1st Year",
    rating: 5,
    quote:
      "The classes are fun, the mentor is strict but fair, and I’ve already made friends for life. Best decision of 2025.",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  },
];

const ReviewsSection = () => {
  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <Quote className="h-3.5 w-3.5" />
            Voices That Matter
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            What Students &amp; Guardians Say
          </h2>
          <p className="mt-3 text-muted-foreground">
            From nervous first-years to relieved parents — hear why families
            trust Smart MMC.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <Card
              key={review.name}
              className={
                "h-full border-2 transition hover:-translate-y-1 hover:shadow-lg" +
                (review.highlight
                  ? " border-primary/40 bg-gradient-to-br from-primary/5 to-transparent"
                  : "")
              }
            >
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <Quote className="h-7 w-7 text-primary/50" />
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  “{review.quote}”
                </p>
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <div className="flex items-center gap-3 border-t pt-4">
                  <div className="relative h-10 w-10 overflow-hidden rounded-full border">
                    <Image
                      src={review.avatar}
                      alt={review.name}
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;