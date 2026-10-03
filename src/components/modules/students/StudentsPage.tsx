"use client";
import { useState } from "react";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import Students from "./Students";
import type { TStudentQuery } from "@/types/student";

const StudentsPage = () => {
  // Default to:
  //  - "active courses only" so archived enrollments don't pollute the list
  //  - isFreeAccount=false so free-class accounts (which have no paid
  //    enrollment, no fee, and no NFC card) don't appear in the operations
  //    dashboard. Marketers can opt in to the free roster via a filter
  //    toggle on the Students component.
  const [query, setQuery] = useState<TStudentQuery>({
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
    activeCoursesOnly: true,
    isFreeAccount: false,
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