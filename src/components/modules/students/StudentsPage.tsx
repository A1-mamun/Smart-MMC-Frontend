"use client";
import { useState } from "react";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import Students from "./Students";
import type { TStudentQuery } from "@/types/student";

const StudentsPage = () => {
  const [query, setQuery] = useState<TStudentQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data, isLoading, refetch, isFetching } = useGetAllStudentsQuery(query);

  return (
    <Students
      studentsData={data?.data || []}
      meta={data?.meta}
      isLoading={isLoading}
      isFetching={isFetching}
      query={query}
      onQueryChange={setQuery}
      refetch={refetch}
    />
  );
};

export default StudentsPage;