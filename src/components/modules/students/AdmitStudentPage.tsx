import AdmitStudentForm from "./AdmitStudentForm";

const AdmitStudentPage = () => {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admit New Student</h2>
        <p className="text-sm text-muted-foreground">
          A unique Student ID and a temporary password will be auto-generated and shown once.
        </p>
      </div>
      <AdmitStudentForm />
    </div>
  );
};

export default AdmitStudentPage;