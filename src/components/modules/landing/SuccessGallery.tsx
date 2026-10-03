import Image from "next/image";
import { Trophy } from "lucide-react";

type Success = {
  name: string;
  achievement: string;
  year: string;
  image: string;
  badge?: string;
};

const SUCCESS_STORIES: Success[] = [
  {
    name: "Anika Tabassum",
    achievement: "A+ in HSC 2025 · BUET CSE",
    year: "Batch 25",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
    badge: "Topper",
  },
  {
    name: "Rafi Ahmed",
    achievement: "A in HSC 2024 · RUET EEE",
    year: "Batch 24",
    image:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Sadia Rahman",
    achievement: "A+ in HSC 2025 · Medical",
    year: "Batch 25",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80",
    badge: "Topper",
  },
  {
    name: "Tanvir Hasan",
    achievement: "A in HSC 2024 · KUET",
    year: "Batch 24",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Mehnaz Sultana",
    achievement: "A+ in HSC 2023 · DU",
    year: "Batch 23",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Imran Hossain",
    achievement: "A in HSC 2025 · CUET",
    year: "Batch 25",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Nusrat Jahan",
    achievement: "A+ in HSC 2024 · Jahangirnagar",
    year: "Batch 24",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    badge: "Topper",
  },
  {
    name: "Saif Iqbal",
    achievement: "A in HSC 2023 · BUET Arch.",
    year: "Batch 23",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80",
  },
];

const SuccessGallery = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-400">
            <Trophy className="h-3.5 w-3.5" />
            Hall of Fame
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Our Successful Students
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real students. Real results. Get inspired by the faces of those who
            walked the same path you’re about to take.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {SUCCESS_STORIES.map((student, idx) => (
            <div
              key={student.name}
              className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[3/4]">
                <Image
                  src={student.image}
                  alt={student.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                {student.badge && (
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-yellow-400/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-900">
                    <Trophy className="h-3 w-3" />
                    {student.badge}
                  </span>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="text-sm font-semibold leading-tight">
                    {student.name}
                  </p>
                  <p className="text-xs text-white/85">{student.achievement}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-white/70">
                    {student.year}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SuccessGallery;