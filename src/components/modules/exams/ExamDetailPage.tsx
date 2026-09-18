"use client";
import { useParams, useRouter } from "next/navigation";
import { useGetExamByIdQuery } from "@/redux/features/exam/exam";
import ExamDetail from "./ExamDetail";

const ExamDetailPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const { data, isLoading, isFetching, refetch } = useGetExamByIdQuery(id ?? "", {
    skip: !id,
  });

  if (!isLoading && !data?.data) {
    if (typeof window !== "undefined") {
      router.push("/dashboard/exams");
    }
    return null;
  }

  return (
    <ExamDetail
      exam={data?.data ?? undefined}
      isLoading={isLoading || isFetching}
      refetch={refetch}
    />
  );
};

export default ExamDetailPage;