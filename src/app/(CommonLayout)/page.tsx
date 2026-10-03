import HeroCarousel from "@/components/modules/landing/HeroCarousel";
import InstructorSection from "@/components/modules/landing/InstructorSection";
import SuccessGallery from "@/components/modules/landing/SuccessGallery";
import ReviewsSection from "@/components/modules/landing/ReviewsSection";
import LocationContactSection from "@/components/modules/landing/LocationContactSection";

const LandingPage = () => {
  return (
    <>
      <HeroCarousel />
      <InstructorSection />
      <SuccessGallery />
      <ReviewsSection />
      <LocationContactSection />
    </>
  );
};

export default LandingPage;