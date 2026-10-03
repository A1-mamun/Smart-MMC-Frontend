import Image from "next/image";
import { Award, BookOpen, GraduationCap, Quote, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STATS = [
  { value: "8+", label: "Years Teaching" },
  { value: "1200+", label: "Students Mentored" },
  { value: "95%", label: "Pass Rate" },
  { value: "50+", label: "A+ Achievers" },
];

const InstructorSection = () => {
  return (
    <section className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <GraduationCap className="h-3.5 w-3.5" />
            Meet Your Mentor
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Learn from the Best
          </h2>
          <p className="mt-3 text-muted-foreground">
            One passionate teacher. One clear vision. Endless success stories.
          </p>
        </div>

        <Card className="overflow-hidden border-2">
          <CardContent className="grid gap-8 p-0 md:grid-cols-5">
            <div className="relative h-72 md:col-span-2 md:h-auto">
              <Image
                src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=80"
                alt="Mohd Mehedi Hasan"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground shadow">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                <span>4.9 · Rated by guardians</span>
              </div>
            </div>

            <div className="md:col-span-3 p-6 sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                Lead Instructor &amp; Founder
              </p>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl">
                Mohd Mehedi Hasan
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                BSc in Computer Science &amp; Engineering · Rajshahi University of Engineering &amp; Technology (RUET)
              </p>

              <div className="mt-6 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                <Quote className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm italic text-muted-foreground">
                  “Education isn’t about memorising answers — it’s about
                  building thinkers. Every student who walks in here deserves a
                  teacher who believes in them first.”
                </p>
              </div>

              <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  RUET CSE Graduate · Academic Excellence Award
                </li>
                <li className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Specialist in HSC Science curriculum
                </li>
                <li className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Personalised mentoring for every batch
                </li>
                <li className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-primary" />
                  50+ students scoring A+ in board exams
                </li>
              </ul>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border bg-background p-4 text-center"
                  >
                    <div className="text-2xl font-bold text-primary">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default InstructorSection;