import HeroCarousel from "@/components/modules/landing/HeroCarousel";
import AdmissionBatchesSection from "@/components/modules/landing/AdmissionBatchesSection";
import OfferedProgramsSection from "@/components/modules/landing/OfferedProgramsSection";
import InstructorSection from "@/components/modules/landing/InstructorSection";
import SuccessGallery from "@/components/modules/landing/SuccessGallery";
import ReviewsSection from "@/components/modules/landing/ReviewsSection";
import LocationContactSection from "@/components/modules/landing/LocationContactSection";

const LandingPage = () => {
  return (
    <>
      <HeroCarousel />
      <OfferedProgramsSection />
      {/* <AdmissionBatchesSection /> */}
      <InstructorSection />
      <SuccessGallery />
      {/* <ReviewsSection /> */}
      <LocationContactSection />
    </>
  );
};

export default LandingPage;
