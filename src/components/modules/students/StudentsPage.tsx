"use client";
import { useState } from "react";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import Students from "./Students";
import type { TStudentQuery } from "@/types/student";

const StudentsPage = () => {
  // Default to "active courses only" so the list excludes students whose
  // enrollments are all in archived / inactive courses. Users who need the
  // full roster can pass `activeCoursesOnly: false` (or clear it in the
  // filter UI).
  const [query, setQuery] = useState<TStudentQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    activeCoursesOnly: true,
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