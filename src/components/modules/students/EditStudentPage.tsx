"use client";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditStudentForm from "./EditStudentForm";

type Props = { params: Promise<{ id: string }> };

const EditStudentPage = ({ params }: Props) => {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/students/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Student</h2>
          <p className="text-sm text-muted-foreground">
            Update personal, guardian, address, and SSC information.
          </p>
        </div>
      </div>
      <EditStudentForm studentId={id} />
    </div>
  );
};

export default EditStudentPage;